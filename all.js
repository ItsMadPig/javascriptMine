var vShaderQuellcode;
var fShaderQuellcode;

var dataLoc;
var hash1Loc;
var midstateLoc;
var targetLoc;
var nonceLoc;

var maxNonce = 0xFFFFFFFF;
var maxCnt = 0;
var reportPeriod = 1000;
var useTimeout = true;
var TotalHashes = 0;
var gl;
var canvas;
var run = true;
var debug = false;
var buf;

var width;
var height;

function throwOnGLError(err, funcName, args) {
    throw WebGLDebugUtils.glEnumToString(err) + " was caused by call to" + funcName;
};

function meinWebGLStart(threads) {
        canvas = document.createElement('canvas');
        if (debug || true) document.body.appendChild(canvas)
        canvas.height = 1;
        canvas.width = threads;

        var names = [ "webgl", "experimental-webgl", "moz-webgl", "webkit-3d" ];
        for (var i=0; i<names.length; i++) {
            try { 
                gl = canvas.getContext(names[i]);
                if (gl) { break; }
            } catch (e) { }
        }

        if(!gl) {
            alert("Fehler: WebGL-Context konnte nicht initialisiert werden");
        }

        var program = gl.createProgram();


        vShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vShader,vShaderQuellcode);
        gl.compileShader(vShader);
        if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
            console.log(gl.getShaderInfoLog(vShader));
        }
        gl.attachShader(program,vShader);

        fShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fShader,fShaderQuellcode);
        gl.compileShader(fShader);
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
            console.log(gl.getShaderInfoLog(fShader));
        }
        gl.attachShader(program,fShader);

        gl.linkProgram(program);
        gl.useProgram(program);

        gl.clearColor ( 1.0, 1.0, 1.0, 1.0 );
        gl.clear ( gl.COLOR_BUFFER_BIT );

        var posAtrLoc = gl.getAttribLocation(program, "vPos");
        gl.enableVertexAttribArray( posAtrLoc );

        var h =  [0x6a09, 0xe667, 0xbb67, 0xae85,
                  0x3c6e, 0xf372, 0xa54f, 0xf53a,
                  0x510e, 0x527f, 0x9b05, 0x688c,
                  0x1f83, 0xd9ab, 0x5be0, 0xcd19];

        var k =  [0x428a, 0x2f98, 0x7137, 0x4491,
                  0xb5c0, 0xfbcf, 0xe9b5, 0xdba5,
                  0x3956, 0xc25b, 0x59f1, 0x11f1,
                  0x923f, 0x82a4, 0xab1c, 0x5ed5,
                  0xd807, 0xaa98, 0x1283, 0x5b01,
                  0x2431, 0x85be, 0x550c, 0x7dc3,
                  0x72be, 0x5d74, 0x80de, 0xb1fe,
                  0x9bdc, 0x06a7, 0xc19b, 0xf174,
                  0xe49b, 0x69c1, 0xefbe, 0x4786,
                  0x0fc1, 0x9dc6, 0x240c, 0xa1cc,
                  0x2de9, 0x2c6f, 0x4a74, 0x84aa,
                  0x5cb0, 0xa9dc, 0x76f9, 0x88da,
                  0x983e, 0x5152, 0xa831, 0xc66d,
                  0xb003, 0x27c8, 0xbf59, 0x7fc7,
                  0xc6e0, 0x0bf3, 0xd5a7, 0x9147,
                  0x06ca, 0x6351, 0x1429, 0x2967,
                  0x27b7, 0x0a85, 0x2e1b, 0x2138,
                  0x4d2c, 0x6dfc, 0x5338, 0x0d13,
                  0x650a, 0x7354, 0x766a, 0x0abb,
                  0x81c2, 0xc92e, 0x9272, 0x2c85,
                  0xa2bf, 0xe8a1, 0xa81a, 0x664b,
                  0xc24b, 0x8b70, 0xc76c, 0x51a3,
                  0xd192, 0xe819, 0xd699, 0x0624,
                  0xf40e, 0x3585, 0x106a, 0xa070,
                  0x19a4, 0xc116, 0x1e37, 0x6c08,
                  0x2748, 0x774c, 0x34b0, 0xbcb5,
                  0x391c, 0x0cb3, 0x4ed8, 0xaa4a,
                  0x5b9c, 0xca4f, 0x682e, 0x6ff3,
                  0x748f, 0x82ee, 0x78a5, 0x636f,
                  0x84c8, 0x7814, 0x8cc7, 0x0208,
                  0x90be, 0xfffa, 0xa450, 0x6ceb,
                  0xbef9, 0xa3f7, 0xc671, 0x78f2];

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        var vertices = new Float32Array([1, 1,-1, 1,
                                         1,-1,-1,-1]);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        gl.vertexAttribPointer(posAtrLoc, 2, gl.FLOAT, false, 0, 0);

        dataLoc = gl.getUniformLocation(program, "data");
        hash1Loc = gl.getUniformLocation(program, "hash1");
        midstateLoc = gl.getUniformLocation(program, "midstate");
        targetLoc = gl.getUniformLocation(program, "target");
        nonceLoc = gl.getUniformLocation(program, "nonce_base");

        var hLoc = gl.getUniformLocation(program, "H");
        var kLoc = gl.getUniformLocation(program, "K");

        gl.uniform2fv(hLoc, h);
        gl.uniform2fv(kLoc, k);
}

function next_run(job, callback) {
    var nonces_per_pixel = 1;
    var t = job.t === undefined ? 0 : job.t;
    var nonce = job.nonce === undefined ? 0 : job.nonce;
    var threads = width * nonces_per_pixel;
    var curCnt = 0;
    var x = 0;
    var y = 0;
    var n;

    var submit_nonce = function() {
        n = derMiner.Util.to_uint16_array(job.nonce);
                            
        job.data[6] = n[0];
        job.data[7] = n[1];

        var r = [];
        for (var j = 0; j < job.half.length; j++)
            r.push(job.half[j]);
        for (var j = 0; j < job.data.length; j++)
            r.push(job.data[j]);
        
        var ret = derMiner.Util.toPoolString(r, true);
        
        job.golden_ticket = ret;
        callback(job);
    }

    while(run) {
        n = derMiner.Util.to_uint16_array(nonce);
        gl.uniform2fv(nonceLoc,  n);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        if (debug) console.log("w:" + width + " h:" + height);

        gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, buf);

        for (var i=0; i<buf.length; i+=4) {
            if (debug) {
                var out = [];
                out.push(derMiner.Util.byte_to_hex(buf[i]));
                out.push(derMiner.Util.byte_to_hex(buf[i+1]));
                out.push(derMiner.Util.byte_to_hex(buf[i+2]));
                out.push(derMiner.Util.byte_to_hex(buf[i+3]));
                console.log("rgba("+(i/4)+"): " + JSON.stringify(out));
            }

            if (nonces_per_pixel == 1) {
                if (buf[i] == 0 &&
                    buf[i+1] == 0 &&
                    buf[i+2] == 0 &&
                    buf[i+3] == 0) {

                    job.nonce = nonce + i * (nonces_per_pixel / 4);
                    submit_nonce();
                }
            } else {
                if (buf[i] != 0 ||
                    buf[i+1] != 0 ||
                    buf[i+2] != 0 ||
                    buf[i+3] != 0) {
                    for (var e = 0; e < 4; e++) {
                        for (var r = 7; r >= 0; r--) {
                            if (buf[i + e] & 1 << r) {
                                var b = (3 - e) * (nonces_per_pixel / 4) + r;
                                job.nonce = nonce + i * (nonces_per_pixel / 4) + b;
                                submit_nonce();
                            }
                        }
                    }
                    
                    job.golden_ticket = null;
                }
            }
        }

        if (nonce >= maxNonce) {
            cb(null);
            break;
        }

        nonce+= threads;
        TotalHashes += threads;

        if (t < (new Date()).getTime()) {
            t = (new Date()).getTime() + reportPeriod;
            job.total_hashes = TotalHashes;
            callback(job);
        }

        if (useTimeout && ++curCnt > maxCnt) {
            curCnt = 0;
            job.nonce = nonce;
            job.t = t;
            var c = function() {
                next_run(job, callback);
            }
            window.setTimeout(c, 1);
            return;
        }
    }

}

function mine(job, callback) {

    gl.uniform2fv(dataLoc, job.data);
    gl.uniform2fv(hash1Loc, job.hash1);
    gl.uniform2fv(midstateLoc, job.midstate);
    gl.uniform2fv(targetLoc, job.target);

    width = canvas.width;
    height = canvas.height;

    buf = new Uint8Array(width * height * 4);
    job.start_date = new Date().getTime();

    next_run(job, callback);
}

function is_golden_hash(hash, target)
{
    var u1 = derMiner.Util.ToUInt32(hash);
    var u2 = derMiner.Util.ToUInt32(target[6]);

    console.log("worker: checking " + u1 + " <= " + u2);
    return (u1 <= u2);
}

function readScript(n) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", n, false);
    xhr.send(null);
    var x = xhr.responseText;
    return x;
};

function onl() {
    vShaderQuellcode = readScript('shader-vs.js');
    fShaderQuellcode = readScript('shader-fs.js');
    print("finished reading shader files\n");
};


var console = { log: function(m) {
                         postMessage({ golden_ticket: false, print: m});
              }};

var TotalHashes = 0;
var useTimeout = false;
try {
    importScripts('sha256.js');
    importScripts('util.js');
} catch (e) {
    useTimeout = true;
}

var reportPeriod = 1000;
var maxNonce = 0xFFFFFFFF;
var maxCnt = 5;
var run = true;

function scanhash(job, progress_report, cb) {
    var midstate = job.midstate;
    var data = job.data;
    var hash1 = job.hash1;
    var target = job.target;

    var t = job.t === undefined ? 0 : job.t;
    var nonce = job.nonce === undefined ? 0 : job.nonce;
    var curCnt = 0;

    if (!run || nonce > 0xFFFFFFFF) return;

    while(run) {

        data[3] = nonce;
        sha256.reset();
        var h1 = sha256.update(midstate, data).state;

        var h2 = hash1;
        for (var i=0; i<8; i++) h2[i] = h1[i];
        sha256.reset();

        var hash = sha256.update(h2).state;

        // console.log(derMiner.Util.toPoolString(hash));
        if (is_golden_hash(hash, target)) {
            job.nonce = nonce;

            var r = [];
            for (var i = 0; i < job.half.length; i++)
                r.push(job.half[i]);
            for (var i = 0; i < job.data.length; i++)
                r.push(job.data[i]);

            var ret = derMiner.Util.toPoolString(r);
            cb(ret);
            job.golden_ticket = null;
        }

        if (nonce >= maxNonce) {
            cb(null);
            break;
        }

        TotalHashes++;
        nonce++;

        if (t < (new Date()).getTime()) {
            t = (new Date()).getTime() + reportPeriod;
            progress_report();
        }

        if (useTimeout && ++curCnt > maxCnt) {
            curCnt = 0;
            job.nonce = nonce;
            job.t = t;
            var c = function() {
                scanhash(job, progress_report, cb);
            }
            window.setTimeout(c, 1);
            return;
        }
    }

    return;
}

function is_golden_hash(hash, target)
{
    if (hash[7] == 0x00000000) {
        var u1 = derMiner.Util.ToUInt32(hash[6]);
        var u2 = derMiner.Util.ToUInt32(target[6]);

        console.log("worker: checking " + u1 + " <= " + u2);
        return (u1 <= u2);
    }
    return false;
}

///// Web Worker /////

onmessage = function(event) {

    if (!event.data || !event.data.run) {
        run = false;
        console.log("worker: forced quit!");
        return;
    }

    var job = event.data;
    job.golden_ticket = false;

    sendProgressUpdate(job);

    var result = function (golden_ticket) {
        job.golden_ticket = golden_ticket;
        postMessage(job);
    };

    // debugger;
    job.start_date = (new Date()).getTime();
    scanhash(event.data, function() { sendProgressUpdate(job); }, result);
};

function sendProgressUpdate(job)
{
    job.total_hashes = TotalHashes;

    postMessage(job);
}


Sha256 = function(init, data) {
  
    var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
             0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
             0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
             0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
             0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
             0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
             0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
             0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  
    var add = function (x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return ((0xFFFF & msw) << 16) | (lsw & 0xFFFF);
    };

    var add_all = function() {
        var sum = arguments[0];
        for (var i = 1; i < arguments.length; i++)
            sum = add(sum, arguments[i]);
        return sum;
    };
  
    var set_state = function(target, source) {
        for (var i = 0; i < 8; i++)
            target[i] = source[i];
    };
  
    var extend_work = function(work, w) {
        for (var i = 0; i < 16; i++)
            work[i] = w[i];
        w = work;

        for (var i = 16; i < 64; i++) {
            var s0 = rotr(w[i - 15],  7) ^ rotr(w[i - 15], 18) ^ shr(w[i - 15],  3);
            var s1 = rotr(w[i -  2], 17) ^ rotr(w[i -  2], 19) ^ shr(w[i -  2], 10);
            w[i] = add_all(w[i-16], s0, w[i-7], s1);
        }
        return w;
    };
  
    var rotr = function(x, n) {
        return (x >>> n) | (x << (32 - n));
    };
  
    var shr = function(x, n) {
        return (x >>> n);
    };
  
    this.state = [0,0,0,0,0,0,0,0];
    set_state(this.state, H);
  
    this.work = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
                 0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
  
    this.hex = function() {
        return derMiner.Util.uint32_array_to_hex(this.state);
    };

    this.reset = function() {
        set_state(this.state, H);
        return this;
    };
  
    this.update = function(init, data) {
        if (!data) { data = init; init = null; }
        if (typeof(init) == 'string')
            init = derMiner.Util.hex_to_uint32_array(init);
        if (init) set_state(this.state, init);
        if (typeof(data) == 'string')
            data = derMiner.Util.hex_to_uint32_array(data);

        var w = extend_work(this.work, data);
        var s = this.state;

        var a = s[0], b = s[1], c = s[2], d = s[3],
        e = s[4], f = s[5], g = s[6], h = s[7];
       
        for (var i = 0; i < 64; i++) {
            var s0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
            var maj = (a & b) ^ (a & c) ^ (b & c);
            var t2 = add(s0, maj);
            var s1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            var ch = (e & f) ^ ((~e) & g);
            var t1 = add_all(h, s1, ch, K[i], w[i]);

            h = g; g = f; f = e;
            e = add(d, t1);
            d = c; c = b; b = a;
            a = add(t1, t2);
        }
        
       
        s[0] = add(s[0], a);
        s[1] = add(s[1], b);
        s[2] = add(s[2], c);
        s[3] = add(s[3], d);
        s[4] = add(s[4], e);
        s[5] = add(s[5], f);
        s[6] = add(s[6], g);
        s[7] = add(s[7], h);

        return this;
    };
  
    if (init) this.update(init, data);
};

sha256 = new Sha256();
if (typeof(derMiner) == 'undefined')
  var derMiner = {};

derMiner.Util = {
  hex_to_uint32_array: function(hex) {
    var arr = [];
    for (var i = 0, l = hex.length; i < l; i += 8) {
        arr.push((parseInt(hex.substring(i, i+8), 16)));
    }
    return arr;
  },
  hex_to_uint16_array: function(hex) {
    var arr = [];
    for (var i = 0, l = hex.length; i < l; i += 4) {
        arr.push((parseInt(hex.substring(i, i+4), 16)));
    }
    return arr;
  },
  uint32_array_to_hex: function(arr) {
    var hex = '';
    for (var i = 0; i < arr.length; i++) {
      hex += derMiner.Util.byte_to_hex(arr[i] >>> 24);
      hex += derMiner.Util.byte_to_hex(arr[i] >>> 16);
      hex += derMiner.Util.byte_to_hex(arr[i] >>>  8);
      hex += derMiner.Util.byte_to_hex(arr[i]       );
    }
    return hex;
  },
  uint16_array_to_hex: function(arr) {
    var hex = '';
    for (var i = 0; i < arr.length; i++) {
      hex += derMiner.Util.byte_to_hex(arr[i] >>>  8);
      hex += derMiner.Util.byte_to_hex(arr[i]       );
    }
    return hex;
  },
  to_uint16_array: function(w) {
        return [(w & 0xffff0000) >> 16, (w & 0x0000ffff) ];
  },
  byte_to_hex: function(b) {
    var tab = '0123456789abcdef';
    b = b & 0xff;
    return tab.charAt(b / 16) +
           tab.charAt(b % 16);
  },
  reverseBytesInWord: function(w) {
    return ((w <<  24) & 0xff000000) |
           ((w <<   8) & 0x00ff0000) |
           ((w >>>  8) & 0x0000ff00) |
           ((w >>> 24) & 0x000000ff);
  },
  reverseBytesInInt: function(w) {
    return ((w << 8) & 0x0000ff00 |
            (w >> 8) & 0x000000ff);
  },
  reverseBytesInWords: function(words) {
    var reversed = [];
    for(var i = 0; i < words.length; i++)
      reversed.push(derMiner.Util.reverseBytesInWord(words[i]));
    return reversed;
  },
  reverseBytesInInts: function(words) {
    var reversed = [];
    for(var i = 0; i < words.length-1; i+=2) {
        reversed.push(derMiner.Util.reverseBytesInInt(words[i+1]));
        reversed.push(derMiner.Util.reverseBytesInInt(words[i]));
    }
    return reversed;
  },
  fromPoolString: function(hex, gl) {
    return gl
           ? derMiner.Util.reverseBytesInInts(derMiner.Util.hex_to_uint16_array(hex))
           : derMiner.Util.reverseBytesInWords(derMiner.Util.hex_to_uint32_array(hex));
  },
  toPoolString: function(data, gl) {
    return gl
           ? derMiner.Util.uint16_array_to_hex(derMiner.Util.reverseBytesInInts(data))
           : derMiner.Util.uint32_array_to_hex(derMiner.Util.reverseBytesInWords(data));
  },
  ToUInt32: function (x) {
    return x >>> 0;
  }
};

var console = window.console ?  window.console : { log: function() {} };
var worker = null;
var testmode = false;

function readScript(n) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", n, false);
    xhr.send(null);
    var x = xhr.responseText;
    return x;
};

function onError(data) {
    $('#info').val(data.status + " " + data.responseText);
}

function onSuccess(jsonresp) {
    var response = jsonresp.result;
    var data = JSON.stringify(response);

    $('#info').val(data);

    var type = $('[type=radio]');

    if (type.length == 0) type = [ {checked:true} , {checked:false} , {checked:false}]
    var job = {};
    var gl = type[2].checked

    job.run = true;
    job.work = data;

    job.midstate = derMiner.Util.fromPoolString(response.midstate, gl);
    job.half = derMiner.Util.fromPoolString(response.data.substr(0, 128), gl);
    job.data = derMiner.Util.fromPoolString(response.data.substr(128, 256), gl);
    job.hash1 = derMiner.Util.fromPoolString(response.hash1, gl);
    job.target = derMiner.Util.fromPoolString(response.target, gl);

    if (testmode) {
        job.nonce = derMiner.Util.fromPoolString("204e2e35")[0];
    } else {
        job.nonce = Math.floor ( Math.random() * 0xFFFFFFFF );
    }

    job.hexdata = response.data;
    
    if (type[2].checked) {
        var postMessage = function(m) {
            onWorkerMessage({ data: m });
        }
        var th = $('#threads')[0].value;
        meinWebGLStart(th);
        mine(job, postMessage);
    } else if (type[0].checked) {
        print("javascript is checked")
        var postMessage = function(m) {
            onWorkerMessage({ data: m });
        }
        worker = { postMessage : function(m) { worker.intMessage( { data: m} ); print("executing javascript"); },
                   intMessage: function() {} };
        var m = readScript('miner.js');
        var s = '(function() {' + m + ';\n' + 'onmessage({ data: job });' + ' worker.intMessage = onmessage; })';
        var run = eval(s);
        run();
    } else {
        worker = new Worker("miner.js");
        worker.onmessage = onWorkerMessage;
        worker.onerror = onWorkerError;
        worker.postMessage(job);
    }
}

function begin_mining()
{
    var tm = $('#testmode');
    testmode = tm.length > 0 && tm[0].checked;
    if (testmode) {
        var dd = '{"midstate":"eae773ad01907880889ac5629af0c35438376e8c4ae77906301c65fa89c2779c","data":"0000000109a78d37203813d08b45854d51470fcdb588d6dfabbe946e92ad207e0000000038a8ae02f7471575aa120d0c85a10c886a1398ad821fadf5124c37200cb677854e0603871d07fff800000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000080020000","hash1":"00000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000010000","target":"0000000000000000000000000000000000000000000000000000f8ff07000000", "sol" : "31952e35"}'; // near match with nonce = 0
        onSuccess({ result: JSON.parse(dd)});
    } else {
        var enqueuMiner = function() {
            get_work();
            window.setTimeout(enqueuMiner, 120*1000);
        };
        window.setTimeout(enqueuMiner, 1000);
    }
}

function get_work() {
    if (worker) {
        try {
            worker.postMessage( { run: false } );
            worker.terminate();
        } catch (e) {}
    }

    $.post("index.php?cache=1&ts=" + (new Date().getTime()),
           '{ "method": "getwork", "id": "json", "params": [] }',
           onSuccess,
           "text json");
}

function onWorkerMessage(event) {
    var job = event.data;

    if(job.print) console.log('worker:' + job.print);

    if (job.golden_ticket) {
        $('#golden-ticket').val(job.golden_ticket);

        if (!testmode) {
            $.post("submitwork.php",
                   { golden_ticket: job.golden_ticket, work: job.work },
                   function(data, textStatus) {
                       console.log("manager:" + data + "#" + textStatus);
                   });
        }
    }
    
    var total_time = ((new Date().getTime()) - job.start_date) / 1000;
    var hashes_per_second = job.total_hashes / total_time;
    $('#total-hashes').val(job.total_hashes);
    $('#hashes-per-second').val(hashes_per_second);
}

function onWorkerError(event) {
	throw event.data;
}

//window.onLoad = function(){
function init_all(){
    Envjs.log("initializing...\n");
    onl();
    Envjs.log("finished loading\n");
    // try {
        var d = document.createElement('div');
        d.setAttribute('style', 'display:none');

        var add = false;
        var arr = [ "total-hashes", "hashes-per-second", "golden-ticket", "info" ];

        for (var i=0; i < arr.length; i++) {
            var n = arr[i];
            var l = document.getElementById(n);
            if (!l) {
                var e = document.createElement('input');
                d.appendChild(e);
                add = true;
            } else {
                l.value = "";
            }
        }

        if (add) {
            document.body.appendChild(d);
        }

    // } catch (e) {
    //     console.log("manager:" + e);
    // }
}
