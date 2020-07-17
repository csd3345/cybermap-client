import pysftp
import click
import pathlib
import pickle
from click_help_colors import HelpColorsCommand
import os
from typing import Dict, Optional


settings_file = pathlib.Path("settings.pk")


def save_settings(data: Dict) -> None:
    # Save a dictionary into a pickle file.
    with settings_file.open("wb") as file:
        pickle.dump(data, file)


def load_settings() -> Optional[Dict]:
    if not settings_file.exists():
        return None
    with settings_file.open(mode = "rb") as file:
        return pickle.load(file)


def validate_path(ctx, param, value):
    if value:
        path = pathlib.Path(value)
        if path.exists():
            return path
        else:
            raise click.BadParameter(f"path {path} does not exist")
    else:
        return None


# region command settings
@click.command(
    cls = HelpColorsCommand,
    help_headers_color = 'green',
    help_options_color = 'blue',
    name = "Auto Upload",
    context_settings = {
        "help_option_names": ['-h', '--help'],
        "ignore_unknown_options": True
    },
    # no_args_is_help = False,
    options_metavar = "<options>"
)
# endregion
@click.option(
    "--host",
    type = click.STRING,
    metavar = "string",
    help = "Remote host to upload files"
)
@click.option(
    "-p",
    "--port",
    type = click.INT,
    metavar = "integer",
    help = "Remote port"
)
@click.option(
    "--user",
    type = click.STRING,
    metavar = "string",
    help = "User to be used for the upload"
)
@click.option(
    "--private-key",
    type = click.Path(exists = True, file_okay = True, dir_okay = False),
    metavar = "file",
    callback = validate_path,
    help = "Remote host to upload files"
)
@click.option(
    "--data",
    type = click.Path(exists = True, file_okay = True, dir_okay = True),
    metavar = "file or directory",
    callback = validate_path,
    help = "Remote host to upload files"
)
@click.option(
    "--remote-folder",
    type = click.STRING,
    metavar = "string",
    help = "Remote folder to upload files"
)
@click.option(
    "-s",
    "--save",
    metavar = "switch",
    is_flag = True,
    help = "Save current options for later use"
)
def main(host, port, user, private_key: pathlib.Path, data: pathlib.Path, remote_folder: str, save: Optional[bool]):
    current_settings: Dict = dict()
    settings_dirty = False
    
    # check which settings are provided
    information = {
        "host": True if host else False,
        "port": True if port else False,
        "user": True if user else False,
        "private_key": True if private_key else False,
        "data": True if data else False,
        "remote_folder": True if remote_folder else False,
        "save": True if save else False,
    }
    
    if settings_file.exists() and click.confirm(
            f"Do you want to load previous settings from file {settings_file.name} ?"):
        current_settings = load_settings()
        
        current_settings["host"] = host if host else current_settings["host"]
        current_settings["port"] = int(port) if port else int(current_settings["port"])
        current_settings["user"] = user if user else current_settings["user"]
        current_settings["private_key"] = validate_path(
            None, None,
            private_key if private_key else current_settings["private_key"]
        )
        current_settings["data"] = validate_path(
            None, None,
            data if data else current_settings["data"]
        )
        current_settings["remote_folder"] = remote_folder if remote_folder else current_settings["remote_folder"]
        
        if host or port or user or private_key or data or remote_folder:
            settings_dirty = True
    else:
        current_settings["host"] = host if host else click.prompt("Enter host address")
        current_settings["port"] = int(port) if port else int(click.prompt("Enter port"))
        current_settings["user"] = user if user else click.prompt("Enter username")
        current_settings["private_key"] = validate_path(
            None, None,
            private_key if private_key else click.prompt("Enter local path to private-key for sftp")
        )
        current_settings["data"] = validate_path(
            None, None,
            data if data else click.prompt("Enter file or directory to upload")
        )
        current_settings["remote_folder"] = remote_folder if remote_folder else click.prompt("Enter remote-folder path")
    
    if save or (settings_dirty and click.confirm("Do you want to save these settings for later use?", abort = False)):
        save_settings(current_settings)
        print(f"Settings successfully saved to {str(settings_file)}")
    
    # cnopts = pysftp.CnOpts(knownhosts = str(pathlib.Path(r"C:\Users\j3di\.ssh\known_hosts")))
    cnopts = pysftp.CnOpts()
    cnopts.hostkeys = None
    
    with pysftp.Connection(
            host = current_settings["host"],
            username = current_settings["user"],
            port = current_settings["port"],
            private_key = current_settings["private_key"],
            cnopts = cnopts
    ) as sftp:
        print(
            f"Connection successful to {current_settings['user']}@{current_settings['host']}:{current_settings['port']}")
        
        if sftp.exists(current_settings["remote_folder"]):
            print(f"Removing previous contents of directory {current_settings['remote_folder']}")
            sftp.execute(f"rm -rf {current_settings['remote_folder']}")
        else:
            print(f"Creating remote directory {current_settings['remote_folder']}")
        
        input("Press to continue...")
        
        # in any case we remake the remote directory
        sftp.makedirs(current_settings['remote_folder'])
        
        if current_settings["data"].is_file():
            with sftp.cd(current_settings["remote_folder"]):
                # upload files
                sftp.put(
                    str(current_settings["data"]),
                    preserve_mtime = True,
                    callback = lambda x, y: print("{} transferred out of {}".format(x, y))
                )
        elif current_settings["data"].is_dir():
            print(f"Recursively adding files & folder(s) to remote host in {current_settings['remote_folder']}")
            with sftp.cd(current_settings["remote_folder"]):
                path_to_prc: pathlib.Path = current_settings["data"]
                
                for dirpath, dirs, files in os.walk(str(current_settings["data"])):
                    dirpat2 = pathlib.Path(dirpath).relative_to(path_to_prc)
                    dir_to_posix = pathlib.PurePosixPath(dirpat2)
                    print(f"Creating directory {dir_to_posix}")
                    sftp.makedirs(str(dir_to_posix))
                    print(f"Changing directory to {dir_to_posix} with {len(files)} files")
                    
                    with sftp.cd(str(dir_to_posix)):
                        for file in files:
                            print(f"Transferring file {file} in folder {dir_to_posix}")
                            sftp.put(
                                str(pathlib.Path(dirpath) / file),
                                preserve_mtime = True
                            )


if __name__ == '__main__':
    main()
