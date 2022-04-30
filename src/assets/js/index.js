// UMD / CommonJS modules
//const SerialPort = require('serialport');
//const bootstrap = require('bootstrap');
//const { gsap } = require('gsap/dist/gsap');
//const gsap = require('gsap/dist/gsap').gsap;

// ES Modules
//import { gsap } from 'gsap';

'use strict';

const SerialPort = function(path, openOptions, openCallback) {
    let _isOpen = false;
    const _eventCallbacks = [];
    this.isOpen = function() {
        return _isOpen;
    };
    this.open = function(callback) {
        _isOpen = true;
        setTimeout(callback.bind(callback), 250);
        setTimeout(function() {
            _eventCallbacks['data']('');
        }, 500);
        setTimeout(function() {
            _eventCallbacks['data']('DerbyStick v1.0 2 lanes found' + unescape('%0D%0A'));
        }, 1000);
        setTimeout(function() {
            _eventCallbacks['data']('1 2.1234 2 2.5678' + unescape('%0D%0A'));
        }, 4000);
    };
    this.on = function(event, callback) {
        _eventCallbacks[`${event}`] = callback.bind(callback);
    };
    this.list = function(callback) {
        setTimeout(
            callback.bind(callback, null, [{ comName: 'Test', pnpId: '1234', manufacturer: 'Example Co' }]),
            250
        );
    };
    this.write = function(str, callback) {
        setTimeout(callback.bind(callback), 250);
    };
    this.close = function(callback) {
        _isOpen = false;
        setTimeout(callback.bind(callback), 250);
    };
    this.path = path;
};

//const win = nw.Window.get();
//win.showDevTools();
var model = {
    DISCONNECTED: 'disconnected',
    CONNECTED: 'connected',
    initial: true,
    best: 9.999,
    serialPort: null,
    currentScreen: null,
    nextScreen: null,
    elBest: document.getElementById('best-time'),
    elStatus: document.getElementById('status'),
    elLog: document.getElementById('log'),
    elResetMsg: document.getElementById('reset-msg'),
    elLaneTitle1: document.getElementById('lane1-title'),
    elLaneTitle2: document.getElementById('lane2-title'),
    elLaneTime1: document.getElementById('lane1-time'),
    elLaneTime2: document.getElementById('lane2-time'),
    btnConnect: document.getElementById('btnConnect'),
    selectPort: document.getElementById('selectPort'),

    log: '<div class="message">Waiting...</div>',
    portPath: 'COM3',
    laneReset: false,
    lane1: '0.000',
    lane2: '0.000',
    prevData: '',
    statusMsg: 'Waiting...',
    isConnecting: false,
    isConnected: function() {
        return model.serialPort ? model.serialPort.isOpen() : false;
    },
};
const disconnectAnimate = gsap.timeline({
    defaults: { ease: 'power1.out' },
    paused: true,
});
disconnectAnimate.to('.timer-screen', { duration: 0.5, autoAlpha: 0 }, 1);
disconnectAnimate.to('.connect-screen', { duration: 0.5, autoAlpha: 1 }, 1);
disconnectAnimate.fromTo(
    '.connect-screen__logo',
    { yPercent: 60, autoAlpha: 0 },
    { duration: 1, autoAlpha: 1, yPercent: 0 },
    1
);
disconnectAnimate.fromTo('.connect-screen__cta', { autoAlpha: 0, y: 0 }, { duration: 0.5, autoAlpha: 1 });
disconnectAnimate.fromTo('.connect-screen__connect', { autoAlpha: 0, y: 0 }, { duration: 0.5, autoAlpha: 1 });

const connectAnimate = gsap.timeline({ defaults: { ease: 'power1.out' }, paused: true });
connectAnimate.to('.timer-screen', { duration: 0.5, autoAlpha: 1 }, 2);
connectAnimate.to('.connect-screen', { duration: 0.5, autoAlpha: 0 }, 2);

const resetAnimate = gsap.timeline({ paused: true });
resetAnimate.fromTo(
    '.timer-screen__reset-container',
    { autoAlpha: 1 },
    { duration: 1, ease: 'power3.in', autoAlpha: 0 }
);

var actions = {
    resetTimer: function() {
        model.serialPort.list(function(err, ports) {
            console.group('List of open ports');
            ports.forEach(port => {
                actions.addLog(`${port.comName} / ${port.pnpId} / ${port.manufacturer}`);
            });
            console.groupEnd('ListPorts');
        });

        //	Send single 'space' to reset timer
        model.serialPort.write(' ', (error, results) => {
            if (error) {
                actions.addLog('Error resetting timer (' + error + ')');
                console.log(`Error resetting timer (${error})`, results);
            }
            actions.addLog('Timer reset (Auto)');

            resetAnimate.play(0);

            // Render after reset
            renderView();
        });
    },

    addLog: str => {
        console.log(str);
        const line = `<li class="list-group-item">${str}</li>`;
        model.log += line;
        model.elLog.insertAdjacentHTML('beforeend', line);
        model.elLog.scrollTop = model.elLog.scrollHeight;
    },

    clearLog: () => {
        model.log = '<li class="list-group-item">Log cleared...</li>';
        model.elLog.innerHTML = model.log;
        model.elLog.scrollTop = model.elLog.scrollHeight;
    },

    connectPort: function() {
        model.portPath = model.selectPort.options[model.selectPort.selectedIndex].text;
        model.serialPort = new SerialPort(
            model.portPath,
            {
                baudrate: 1200,
                dataBits: 7,
                stopBits: 2,
                parity: 'none',
            },
            false // this is the openImmediately flag [default is true]
        );

        // Open port
        actions.openPort();
    },

    closePort: function() {
        model.serialPort.close(function(error) {
            if (error) {
                model.statusMsg = `Error closing port ${model.serialPort.path} (${error})`;
            } else {
                model.isConnecting = false;
                model.statusMsg = `${model.serialPort.path} Port Closed`;
                model.serialPort = null;
            }
            actions.addLog(model.statusMsg);
            renderView();
        });

        // Clear log
        actions.clearLog();
    },

    openPort: function() {
        model.statusMsg = `${model.serialPort.path} Port Connecting...`;
        actions.addLog(model.statusMsg);
        model.isConnecting = true;
        renderView();

        model.serialPort.open(function(error) {
            if (error) {
                model.statusMsg = `Error opening port ${model.serialPort.path} (${error})`;
                model.isConnecting = false;
            } else {
                model.statusMsg = `${model.serialPort.path} Port Ready`;
                model.isConnecting = false;

                // Auto reset
                actions.resetTimer();

                model.serialPort.on('data', function(data) {
                    var str = String(data);
                    //actions.addLog(`Raw Data: "${str}" Len:${str.length}`);

                    if (str) {
                        // Is complete data?
                        if (str.length >= 22 && escape(str).endsWith('%0D%0A')) {
                            var arrResults = /(\d)\s+([0-9]*\.[0-9]+|[0-9]+)\s+(\d)\s+([0-9]*\.[0-9]+|[0-9]+)/.exec(
                                str
                            );
                            console.log(arrResults);
                            actions.addLog(`Raw Data: "${str}" Len:${str.length}`);
                            //actions.addLog( 'Complete results' );
                            model.prevData = '';
                            model.laneReset = false;

                            if (arrResults[1] == 0 && arrResults[3] == 0) {
                                actions.addLog('Timer Reset (Manual)');
                                model.laneReset = true;
                            } else {
                                model['lane' + arrResults[1]] = parseFloat(arrResults[2]); // Winner
                                model['lane' + arrResults[3]] = parseFloat(arrResults[4]);
                            }

                            // Auto reset
                            actions.resetTimer();
                        } else {
                            // Sometimes the data comes in multiple passes, this tries to salvage the data
                            if (model.prevData && escape(str).endsWith('%0D%0A')) {
                                str = model.prevData + str;
                                var arrResults = /(\d)\s+([0-9]*\.[0-9]+|[0-9]+)\s+(\d)\s+([0-9]*\.[0-9]+|[0-9]+)/.exec(
                                    str
                                );
                                console.log(arrResults);
                                //actions.addLog( 'Reconstructed results: "' + str + '" "' + escape(str) + '"' + str.length);
                                actions.addLog(`(Multi) Raw Data: "${str}" Len:${str.length}`);
                                //actions.addLog( 'Complete results' );
                                model.prevData = '';
                                model.laneReset = false;

                                if (arrResults[1] == 0 && arrResults[3] == 0) {
                                    actions.addLog('Timer Reset (Manual)');
                                    model.laneReset = true;
                                } else {
                                    model['lane' + arrResults[1]] = parseFloat(arrResults[2]); // Winner
                                    model['lane' + arrResults[3]] = parseFloat(arrResults[4]);
                                }

                                // Auto reset
                                actions.resetTimer();
                                // If data is split, save the data
                            } else {
                                model.prevData = model.prevData + str;
                                console.log('model.prevData', model.prevData);
                                //actions.addLog( 'Partial results' );
                            }
                        }
                    } else {
                        actions.addLog('Failed to get results');
                    }

                    // Render after data
                    renderView();
                });
            }

            actions.addLog(model.statusMsg);
            renderView();
        });
    },
};

// List ports
// Currently not available
/*model.serialPort.list(function(err, ports) {
    actions.addLog('Open ports');
    ports.forEach(port => {
        console.log(port);
        actions.addLog(`${port.comName} ${port.pnpId} ${port.manufacturer}`);
    });
});*/

function renderDisconnected() {
    console.log('renderDisconnected');
    model.btnConnect.removeAttribute('disabled');
    if (null === model.currentScreen) {
        disconnectAnimate.play(0);
    } else {
        // Only animate if different screen
        if (model.nextScreen != model.currentScreen) {
            const tl = gsap.timeline();
            tl.add(connectAnimate.reverse(0));
            tl.add(disconnectAnimate.play(0), '-=2.5');
        }
    }
    model.currentScreen = model.DISCONNECTED;
}

function renderConnecting() {
    console.log('renderConnecting');
    model.btnConnect.setAttribute('disabled', 'disabled');

    // Go to the end of the intro animation
    // This is to insure if you jump straight to renderConnecting()
    // the animation is forced to be completed
    disconnectAnimate.seek(disconnectAnimate.endTime());
    //gsap.to('.connect-screen__connect', { duration: 0.5, autoAlpha: 0.5 });
    model.currentScreen = model.DISCONNECTED;
}

function renderConnected() {
    console.log('renderConnected');
    model.btnConnect.removeAttribute('disabled');

    // Only animate if different screen
    if (model.nextScreen != model.currentScreen) {
        const tl = gsap.timeline();
        tl.add(disconnectAnimate.reverse());
        tl.add(connectAnimate.play(0), '-=2.5');
    }

    if (model.laneReset || (model.lane1 > 0 && model.lane2 > 0 && model.lane1 == model.lane2)) {
        // Switch error
        model.elLaneTime1.innerHTML = 'Error';
        model.elLaneTime2.innerHTML = 'Error';
    } else {
        // Show winner notification
        const tl2 = gsap.timeline({ defaults: { ease: 'power2.in' } });
        if (model.lane1 < model.lane2) {
            tl2.to(model.elLaneTitle2, { duration: 0, color: '#000' }, 1);
            tl2.to(model.elLaneTime2, { duration: 0, color: '#000' }, 1);
            tl2.from(model.elLaneTitle1, { duration: 1, color: '#00FF00' }, 2);
            tl2.from(model.elLaneTime1, { duration: 1, color: '#00FF00' }, 2);
        } else if (model.lane2 < model.lane1) {
            tl2.to(model.elLaneTitle1, { duration: 0, color: '#000' }, 1);
            tl2.to(model.elLaneTime1, { duration: 0, color: '#000' }, 1);
            tl2.from(model.elLaneTitle2, { duration: 1, color: '#00FF00' }, 2);
            tl2.from(model.elLaneTime2, { duration: 1, color: '#00FF00' }, 2);
        }

        // Show lane times
        model.elLaneTime1.innerHTML = `${model.lane1}s`;
        model.elLaneTime2.innerHTML = `${model.lane2}s`;

        // Update best time
        // Don't allow best times less than 2.2s in case it's a glitch
        if (model.best > model.lane1 && model.lane1 > 2.2) {
            model.best = model.lane1;
        }
        if (model.best > model.lane2 && model.lane2 > 2.2) {
            model.best = model.lane2;
        }
        model.elBest.innerHTML = `${model.best}s`;
    }

    model.laneReset = false;
    model.currentScreen = model.CONNECTED;
}

function renderView() {
    console.log('renderView');
    if (true === model.isConnected()) {
        model.nextScreen = model.CONNECTED;
        renderConnected();
    } else {
        if (model.isConnecting) {
            model.nextScreen = model.DISCONNECTED;
            renderConnecting();
        } else {
            model.nextScreen = model.DISCONNECTED;
            renderDisconnected();
        }
    }

    model.elStatus.innerHTML = model.statusMsg;
    document.getElementById('node-version').innerText = process.versions.node;
    document.getElementById('nw-version').innerText = process.versions['node-webkit'];
    document.getElementById('nw-flavor').innerText = process.versions['nw-flavor'];
}

// Show window once loaded and ready
//onload = function() {
win.show();

// Auto open devtools
win.showDevTools();

renderView();
//};
