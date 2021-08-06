#!/usr/bin/env python

import pandas as pd
from os import path

url = "https://www.dwd.de/DE/leistungen/opendata/help/warnungen/cap_warncellids_csv.csv?__blob=publicationFile&v=3"
df = pd.read_csv(url, sep=";")
df = df[~df['KENNUNG (NUTS)'].isnull()]
df = df.drop(['KENNUNG (NUTS)', 'KENNUNG (SIGN)', 'KURZNAME'], axis=1)

main_path = path.realpath(path.join(path.dirname(__file__), ".."))
df.to_csv(path.join(main_path, 'warncellids.csv'), index=False)
