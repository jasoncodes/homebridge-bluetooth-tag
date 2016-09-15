var _ = require('lodash');

var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-bluetooth-tag', 'Bluetooth Tag', TagAccessory);
};

function TagAccessory(log, config) {
  this.log = log;

  this.address = config.address;

  this.noble = require('noble');
  this.noble.on('stateChange', this.onStateChange.bind(this));
  this.noble.on('discover', this.onDiscoverPeripheral.bind(this));
}

TagAccessory.prototype.getServices = function() {
  this.service = new Service.StatelessProgrammableSwitch();

  return [this.service];
};

TagAccessory.prototype.onStateChange = function(state) {
  if (state == 'poweredOn') {
    this.discoverTag();
  }
};

TagAccessory.prototype.discoverTag = function() {
  this.log('scanning');
  this.noble.startScanning(['1802'], false);
};

TagAccessory.prototype.onDiscoverPeripheral = function(peripheral) {
  var address = peripheral.address;
  if (address == 'unknown') {
    address = peripheral.id;
  }

  var canConnect = !this.address || address == this.address;
  this.log((canConnect ? 'connecting' : 'ignoring') + ' ' + peripheral.advertisement.localName + ' (' + address + ')');
  if (!canConnect) return;

  this.peripheral = peripheral;

  this.noble.stopScanning();
  this.peripheral.once('disconnect', this.onDisconnect.bind(this));
  this.peripheral.connect(this.onConnect.bind(this));
};

TagAccessory.prototype.onConnect = function(error) {
  if (error) {
    this.log('failed to connect: ' + error);
    this.discoverTag();
    return;
  }

  this.log('connected');
  this.peripheral.discoverSomeServicesAndCharacteristics([], ['ffe1', '2a06'], this.onDiscoverServicesAndCharacteristics.bind(this));
};

TagAccessory.prototype.onDisconnect = function(error) {
  this.log('disconnected');
  this.peripheral = null;
  this.discoverTag();
};

TagAccessory.prototype.onDiscoverServicesAndCharacteristics = function(error, services, characteristics) {
  if (error) {
    this.log('failed to discover characteristics: ' + error);
    return;
  }

  characteristics = _.keyBy(characteristics, function(characteristic) {
    return (characteristic._serviceUuid + ':' + characteristic.uuid).toLowerCase();
  });

  this.alertCharacteristic = characteristics['1802:2a06'];

  this.keyPressCharacteristic = characteristics['ffe0:ffe1'];
  if (!this.keyPressCharacteristic) {
    this.log('could not find key press characteristic');
  } else {
    this.keyPressCharacteristic.on('data', this.onKeyPress.bind(this));
    this.keyPressCharacteristic.subscribe(function (error) {
      if (error) {
        this.log('failed to subscribe to key presses');
      } else {
        this.log('subscribed to key presses');
      }
    }.bind(this));
  }
};

TagAccessory.prototype.identify = function(callback) {
  this.log('identify');
  if (this.peripheral) {
    this.alertCharacteristic.write(Buffer.from([0x02]), true);
    setTimeout(function() {
      this.alertCharacteristic.write(Buffer.from([0x00]), true);
    }.bind(this), 250);
    callback();
  } else {
    callback(new Error('not connected'));
  }
};

TagAccessory.prototype.onKeyPress = function() {
  this.log('key press');
  var characteristic = this.service.getCharacteristic(Characteristic.ProgrammableSwitchEvent);
  characteristic.setValue(true);
  setTimeout(function() {
    characteristic.setValue(false);
  }, 1000);
};
