# homebridge-bluetooth-tag

A Homebridge plugin for exposing Bluetooth Low Energy button tags as switches in HomeKit.

## Supported Devices

This plugin has been tested with "iTag" bluetooth trackers which can be found on eBay for about AU$10.
Any device which exposes alert (1802:2A06) and button (FFE0:FFE1) characteristics should work.
These are typically listed to be used with the "iTracing" mobile app.

## Example Homebridge Configuration

```json
"accessories": [
  {
    "accessory": "Bluetooth Tag",
    "name": "Bedroom Light Switch",
    "address": "01:23:45:67:89:ab"
  }
]
```

The `address` is optional. If omitted, the first device found will be used.
It is however recommended to set the address to avoid inadvertent connection to the wrong device.
The easiest way to find the address is to start the plugin without an address and then check the logs.
You should see output like `connecting iTAG (01:23:45:67:89:ab)`.
