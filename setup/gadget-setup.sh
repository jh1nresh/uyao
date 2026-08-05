#!/bin/bash
# Configure the Pi 4 USB-C port as a HID keyboard gadget (/dev/hidg0).
# Prereq (once): add to /boot/firmware/config.txt:  dtoverlay=dwc2
#                add to /boot/firmware/cmdline.txt: modules-load=dwc2
# Run at boot (systemd unit provided in pharmabox.service).
set -euo pipefail

G=/sys/kernel/config/usb_gadget/pharmabox
modprobe libcomposite
[ -d "$G" ] && exit 0  # already configured

mkdir -p "$G"
cd "$G"
echo 0x1d6b > idVendor    # Linux Foundation
echo 0x0104 > idProduct   # Multifunction composite
echo 0x0100 > bcdDevice
echo 0x0200 > bcdUSB

mkdir -p strings/0x409
echo "PB-0001"    > strings/0x409/serialnumber
echo "PharmaBox"  > strings/0x409/manufacturer
echo "Barcode Scanner" > strings/0x409/product   # what the POS sees

mkdir -p configs/c.1/strings/0x409
echo "Config 1" > configs/c.1/strings/0x409/configuration
echo 250 > configs/c.1/MaxPower

mkdir -p functions/hid.usb0
echo 1 > functions/hid.usb0/protocol      # keyboard
echo 1 > functions/hid.usb0/subclass      # boot interface
echo 8 > functions/hid.usb0/report_length
# Standard boot keyboard report descriptor
echo -ne '\x05\x01\x09\x06\xa1\x01\x05\x07\x19\xe0\x29\xe7\x15\x00\x25\x01\x75\x01\x95\x08\x81\x02\x95\x01\x75\x08\x81\x03\x95\x05\x75\x01\x05\x08\x19\x01\x29\x05\x91\x02\x95\x01\x75\x03\x91\x03\x95\x06\x75\x08\x15\x00\x25\x65\x05\x07\x19\x00\x29\x65\x81\x00\xc0' \
  > functions/hid.usb0/report_desc

ln -s functions/hid.usb0 configs/c.1/
ls /sys/class/udc > UDC
echo "gadget up: /dev/hidg0"
