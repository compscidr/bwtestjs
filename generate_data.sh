#!/bin/bash
dd if=/dev/urandom of=20kb.dat bs=1024 count=20
dd if=/dev/urandom of=40kb.dat bs=1024 count=40
dd if=/dev/urandom of=180kb.dat bs=1024 count=180
dd if=/dev/urandom of=360kb.dat bs=1024 count=360
dd if=/dev/urandom of=720kb.dat bs=1024 count=720
dd if=/dev/urandom of=1440kb.dat bs=1024 count=1440
dd if=/dev/urandom of=5760kb.dat bs=1024 count=5760
dd if=/dev/urandom of=17280kb.dat bs=1024 count=17280
dd if=/dev/urandom of=60mb.dat bs=1048576 count=60
dd if=/dev/urandom of=300mb.dat bs=1048576 count=300
dd if=/dev/urandom of=600mb.dat bs=1048576 count=600
