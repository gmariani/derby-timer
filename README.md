# Overview
Pinewood derby interface for DerbyStick

# How to use
1. Insert DerbyStick into computer and note the COM port it's connected to
	- The driver will assign a COM port number to the USB Timer. To find this assigned number look in your Windows Device Manager. Look under <Start>, <Control Panel>, <Systems>, <Hardware>, <Device Manager>.
	- In the Device Manager you should find a �Ports� line if the USB Timer was recognized by the System.
	- You may see the device called out as Silicon Labs. This COM Port # is what you will use when using DerbyTimer
	- If necessary, confirm the settings on the device:
		- Bits per second = 1200
		- Data bits= 7
		- Parity = none
		- Stop bits = 2
		- Flow control = none
2. Connect Switch to first set of pins on DerbyStick
3. Connect light sensors to the DerbyStick with the black stripe facing up in the '1' and '2' pins respectively
4. Connect IR lights to plug and place over light sensors
5. Open DerbyTimer and select the COM port noted earlier and click on 'Connect'.
6. Perform the Initial Reset by moving the Start Switch from Open to Closed and back to Open - holding the Switch Closed for at least 0.5 seconds to Reset the timer. This will display "DerbyStick4L v1.0 - 2 Lanes Found" (approximately) in the event log when done properly. The DerbyStick LED will also flash once for each sensor found. If no sensors are found, the LED will flash slowly until the timer is removed from the USB and reinserted.
7. When ready to race, hold the Switch closed for at least 0.5 seconds to reset the timer. When the Switch is then opened, the timer will begin timing the race and the LED will turn on while racing. When all cars have finished OR 9.8 seconds has elapsed, the timer will stop and the LED will turn off.

# For Developers
npm install --global node-gyp node-pre-gyp nw-gyp
npm install --global --production windows-build-tools
npm install serialport --build-from-source
npm install bootstrap
npm install jquery popper.js

/src = nwjs-sdk-v0.44.2-win-x64
/dist = nwjs-v0.44.2-win-x64