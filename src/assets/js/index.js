// UMD / CommonJS modules
//import { gsap } from 'gsap';
//import { gsap } from "gsap/dist/gsap";
//const { gsap } = require('gsap/dist/gsap');
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
    };
    this.on = function(event, callback) {
        _eventCallbacks[`${event}`] = callback.bind(callback);
    };
    this.list = function() {
        return true;
    };
    this.write = function() {
        return true;
    };
    this.close = function() {
        _isOpen = false;
    };
    this.path = path;
}; //require('serialport');
const win = nw.Window.get();

// Auto open devtools
win.showDevTools();

var model = {
    best: 9.999,
    serialPort: null,
    elBest: document.getElementById('best'),
    elStatus: document.getElementById('status'),
    elLog: document.getElementById('log'),
    elLane1: document.getElementById('lane1'),
    elLane2: document.getElementById('lane2'),
    elWinner1: document.getElementById('winner1'),
    elWinner2: document.getElementById('winner2'),
    btnReset: document.getElementById('btnReset'),
    btnConnect: document.getElementById('btnConnect'),
    btnClose: document.getElementById('btnClose'),
    selectPort: document.getElementById('selectPort'),
    sectDiscon: document.getElementById('state-disconnected'),
    sectCon: document.getElementById('state-connected'),
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

var actions = {
    resetTimer: function() {
        model.serialPort.list(function(err, ports) {
            actions.addLog('Open ports');
            ports.forEach(port => {
                console.log(port);
                actions.addLog(`${port.comName} ${port.pnpId} ${port.manufacturer}`);
            });
        });

        //	Send single 'space' to reset timer
        model.serialPort.write(' ', (error, results) => {
            if (error) {
                actions.addLog('Error resetting timer (' + error + ')');
                console.log('Error resetting timer ' + error, results);
            }
            actions.addLog('Auto reset timer');
            actions.addLog('-------------------');

            // Render after reset
            renderView();
        });
    },

    addLog: str => {
        model.log += '<div class="message">' + str + '</div>';
        model.elLog.insertAdjacentHTML('beforeend', '<div class="message">' + str + '</div>');
        model.elLog.scrollTop = model.elLog.scrollHeight;
    },

    clearLog: () => {
        model.log = '<div class="message">Waiting...</div>';
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
                model.elStatus.innerHTML = `Error closing port ${model.serialPort.path} (${error})`;
            } else {
                model.isConnecting = false;
                model.statusMsg = `${model.serialPort.path} Port Closed`;
                actions.addLog(model.statusMsg);
                model.serialPort = null;

                // Render after close
                renderView();
            }
        });

        // Clear log
        actions.clearLog();
    },

    openPort: function() {
        model.statusMsg = `${model.serialPort.path} Port Connecting...`;
        model.isConnecting = true;
        renderView();

        model.serialPort.open(function(error) {
            if (error) {
                model.statusMsg = `Error opening port ${model.serialPort.path} (${error})`;
                model.isConnecting = false;
                renderView();
            } else {
                model.isConnecting = false;
                model.statusMsg = `${model.serialPort.path} Port Ready`;
                actions.addLog(model.statusMsg);

                // Auto reset
                actions.resetTimer();

                model.serialPort.on('data', function(data) {
                    var str = String(data);
                    //actions.addLog( 'Raw Data: "' + str + '" Len:' + str.length);

                    if (str) {
                        // Is complete data?
                        if (str.length >= 22 && escape(str).endsWith('%0D%0A')) {
                            var arrResults = /(\d)\s+([0-9]*\.[0-9]+|[0-9]+)\s+(\d)\s+([0-9]*\.[0-9]+|[0-9]+)/.exec(
                                str
                            );
                            console.log(arrResults);
                            actions.addLog('Raw Data: "' + str + '" Len:' + str.length);
                            //actions.addLog( 'Complete results' );
                            model.prevData = '';
                            model.laneReset = false;

                            if (arrResults[1] == 0 && arrResults[3] == 0) {
                                actions.addLog('Manual Timer Reset');
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
                                actions.addLog('(Multi) Raw Data: "' + str + '" Len:' + str.length);
                                //actions.addLog( 'Complete results' );
                                model.prevData = '';
                                model.laneReset = false;

                                if (arrResults[1] == 0 && arrResults[3] == 0) {
                                    actions.addLog('Manual Timer Reset');
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
    model.btnConnect.disabled = false;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to('.timer-screen', { duration: 0, autoAlpha: 0 });
    tl.fromTo('.connect-screen', { autoAlpha: 0 }, { duration: 0, autoAlpha: 1 });
    tl.fromTo(
        '.connect-screen__logo',
        { yPercent: 60, autoAlpha: 0 },
        { duration: 1, delay: 0.5, autoAlpha: 1, yPercent: 0 }
    );
    tl.from('.connect-screen__cta', { duration: 0.5, opacity: 0 });
    tl.from('.connect-screen__connect', { duration: 0.5, autoAlpha: 0 });
    tl.play(1);
}

function renderConnecting() {
    console.log('renderConnecting');
    model.btnConnect.disabled = true;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.to('.timer-screen', { duration: 0.5, autoAlpha: 0 });
    tl.to('.connect-screen', { duration: 0.5, autoAlpha: 1 });
    tl.to('.connect-screen__connect', { duration: 0.5, autoAlpha: 0.5 });
    tl.play(1);
}

function renderConnected() {
    console.log('renderConnected');
    model.btnConnect.disabled = false;

    const tl = gsap.timeline({ defaults: { ease: 'power1.out' } });
    tl.to('.connect-screen__cta', { duration: 1, autoAlpha: 0, y: '+=10' });
    tl.to('.connect-screen__connect', { duration: 1, delay: -0.25, autoAlpha: 0, y: '+=10' });
    tl.to('.connect-screen__logo', { duration: 1, delay: -0.5, autoAlpha: 0, yPercent: 10 });
    tl.to('.connect-screen', { duration: 0.5, autoAlpha: 0 });
    tl.to('.timer-screen', { duration: 0.5, autoAlpha: 1 });
    tl.play(1);

    // Hide winner notification
    model.elWinner1.classList.remove('show');
    model.elWinner2.classList.remove('show');

    // -> triggering reflow /* The actual magic */
    void model.elWinner1.offsetWidth;
    void model.elWinner2.offsetWidth;

    if (model.laneReset || (model.lane1 > 0 && model.lane2 > 0 && model.lane1 == model.lane2)) {
        // Switch error
        model.elLane1.innerHTML = 'Error';
        model.elLane2.innerHTML = 'Error';
    } else {
        // Show winner notification
        if (model.lane1 < model.lane2) {
            model.elWinner1.classList.add('show');
        } else if (model.lane2 < model.lane1) {
            model.elWinner2.classList.add('show');
        }

        // Show lane times
        model.elLane1.innerHTML = `${model.lane1}s`;
        model.elLane2.innerHTML = `${model.lane2}s`;

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
}

function renderView() {
    if (true === model.isConnected()) {
        renderConnected();
    } else {
        if (model.isConnecting) {
            renderConnecting();
        } else {
            renderDisconnected();
        }
    }

    model.elStatus.innerHTML = model.statusMsg;
    document.getElementById('node-version').innerText = process.versions.node;
    document.getElementById('nw-version').innerText = process.versions['node-webkit'];
    document.getElementById('nw-flavor').innerText = process.versions['nw-flavor'];
}

// Show window once loaded and ready
onload = function() {
    win.show();
    renderView();
};
