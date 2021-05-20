#!/usr/bin/env python

import yaml
import json
from os import walk

list_of_files = []
directory ="_locations/"

# from https://stackoverflow.com/a/3207973
_, _, filenames = next(walk(directory))

for location in filenames:
    with open("_locations/"+location, "r") as f:
        data_yaml, data_md = f.read()[3:].split("\n---\n")
        try:
            parsed_yaml= yaml.safe_load(data_yaml)
            location_dict = {
                "name": location[:-3],
                "data": parsed_yaml,
                "markdown": data_md
            }
            list_of_files.append(location_dict)

        except yaml.YAMLError as exc:
            print(exc)

with open('locations.json', 'w', encoding='utf-8') as f:
    json.dump(list_of_files, f, ensure_ascii=False, indent=2)
