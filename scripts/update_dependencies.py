#!/usr/bin/python3

import os
import shutil
import subprocess
import json


RELEASE_DIR = '../src/verible_release'
RELEASE_INFO_FILE = '../src/verible_release_info.json'
GET_RELEASES_CMD = 'curl -s https://api.github.com/repos/google/verible/releases/latest | jq -r ".assets[].name"'
GET_TAG_CMD = 'curl -s https://api.github.com/repos/google/verible/releases/latest | grep -oP \'"tag_name": "\K(.*)(?=")\''


releases = subprocess.check_output(GET_RELEASES_CMD, shell=True).decode('utf8').strip().split('\n')
tag = subprocess.check_output(GET_TAG_CMD, shell=True).decode('utf8').strip()
if os.path.exists(RELEASE_DIR):
  shutil.rmtree(RELEASE_DIR)
os.mkdir(RELEASE_DIR)
release_subdirs = [item[8 + len(tag) + 1:-7] for item in releases]
for index, item in enumerate(releases):
  download_url = 'https://github.com/google/verible/releases/download/' + tag + '/' + item
  item_dir = release_subdirs[index]
  os.mkdir(os.path.join(RELEASE_DIR, item_dir))
  download_command = 'wget -c ' + download_url + ' -O - | tar -xz -C ' + os.path.join(RELEASE_DIR, item_dir) + ' ' + \
    'verible-' + tag + '/bin/verilog_format ' + \
    'verible-' + tag + '/bin/verilog_lint ' + \
    'verible-' + tag + '/bin/verilog_syntax '
  result = subprocess.check_output(download_command, shell=True).decode('utf8').strip()
  print(download_command)

release_info = {'release_subdirs': release_subdirs}
with open(RELEASE_INFO_FILE, 'w') as output_file:
  output_file.write(json.dumps(release_info, indent=4))