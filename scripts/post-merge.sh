#!/bin/bash
set -e
pnpm install --frozen-lockfile
pip install -q -r requirements.txt
