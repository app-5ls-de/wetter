#!/usr/bin/env python

import pandas as pd

url = "https://www.dwd.de/DE/leistungen/opendata/help/warnungen/cap_warncellids_csv.csv?__blob=publicationFile&v=3"
df = pd.read_csv(url, sep=";")
df = df[~df['KENNUNG (NUTS)'].isnull()]
df = df.drop(['KENNUNG (NUTS)', 'KENNUNG (SIGN)', 'KURZNAME'], axis=1)

df.to_csv('warncellids.csv', index=False)
