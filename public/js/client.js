"use strict";
let INPUT_COLOR = $('#color');
let INPUT_SIZE = $('#size');

let socket = null; /* Socket IO connection instance */
const BRUSH_SIZE = {
    TINY: 1,
    SMALL: 5,
    MEDIUM: 10,
    LARGE: 15,
    XLARGE: 20,
}
const BRUSH_COLOR = {
    BLACK: "#000000",
    WHITE: "#FFFFFF",
    RED: "#FF0000",
    GREEN: "#00FF00",
    BLUE: "#0000FF",
}
const State = {
    isDrawing: false, /* Flag to determine drawing behaviour */
    prevX: 0, /* Previous X coordinate of mouse, to determine stroke */
    prevY: 0, /* Previous Y coordinate of mouse, to determine stroke */
}
const Serializer = {
    serialize: function (drawobj) {
        let buffer = new ArrayBuffer(12);
        let color = drawobj.brush.color;
        let r = parseInt(color[1] + color[2], 16);
        let g = parseInt(color[3] + color[4], 16);
        let b = parseInt(color[5] + color[6], 16);
        let ui8View = new Uint8Array(buffer);
        let ui16View = new Uint16Array(buffer);
        ui8View[0] = drawobj.brush.size;
        ui8View[1] = r;
        ui8View[2] = g;
        ui8View[3] = b;
        ui16View[2] = drawobj.stroke.x1;
        ui16View[3] = drawobj.stroke.y1;
        ui16View[4] = drawobj.stroke.x2;
        ui16View[5] = drawobj.stroke.y2;
        return buffer;
    },
    deserialize: function (buffer) { //refactor everything ok ok
        let ui8View = new Uint8Array(buffer);
        let ui16View = new Uint16Array(buffer);
        let size = ui8View[0];
        let r = ui8View[1];
        let rh = r.toString(16);
        rh = rh[1] ? rh : "0" + rh;
        let g = ui8View[2];
        let gh = g.toString(16);
        gh = gh[1] ? gh : "0" + gh;
        let b = ui8View[3];
        let bh = g.toString(16);
        bh = bh[1] ? bh : "0" + bh;
        let x1 = ui16View[2];
        let y1 = ui16View[3];
        let x2 = ui16View[4];
        let y2 = ui16View[5];
        let stroke = new Stroke(x1, y1, x2, y2);
        let hexcolor = "#" + rh + bh + gh;
        let brush = new Brush(size, hexcolor);
        return new DrawableObject(stroke, brush);
    }
}
const Network = {
    sendDrawData: function (drawobj) {
        let drawbytes = Serializer.serialize(drawobj);
        socket.emit('draw', drawbytes);
    },
    receiveDrawData: function (drawbytes) {
        console.debug("DRAWING REC. DATA");
        let drawobj = Serializer.deserialize(drawbytes);
        console.info(drawobj);
        drawObjectOnCanvas(drawobj);
        updateStage();
    },
    connectToServer: function (debug = false) {
        let _this = this;
        console.log("Connecting to server.. ", debug ? "Debug mode." : "");
        socket = debug ? io("localhost:8080") : io();
        socket.on('connect', function () {
            console.info('Connected to the server.');
        });
        socket.on('error', function (err) {
            console.err("Connection error: ", err);
        });
        socket.on('disconnect', function () {
            console.info("Disconnected from server.");
        });
        socket.on('draw', function (drawbytes) {
            _this.receiveDrawData(drawbytes);
        });
    },
}
class Brush {
    constructor(size = BRUSH_SIZE.MEDIUM, color = BRUSH_COLOR.RED) {
        this.style = "round";
        this.size = size;
        this.color = color;
    }
}
class Stroke {
    constructor(x1 = 0, y1 = 0, x2 = 0, y2 = 0) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }
}
class DrawableObject {
    constructor(stroke, brush) {
        this.stroke = stroke;
        this.brush = brush;
    }
}

console.debug("Initializing whiteboard");
const brush = new Brush();

/* createJS stage */
const stage = new createjs.Stage("canvas");
stage.enableDOMEvents(true);

/* Background element of the stage (a white rectangle the size of the canvas) */
const whiteboard = new createjs.Shape();
whiteboard.graphics.beginFill("#FFF").drawRect(0, 0, 800, 600);

whiteboard.on("mousedown", handleMouseDown);
whiteboard.on("mouseout", handleMouseOut);
whiteboard.on("pressup", handlePressUp);
whiteboard.on("pressmove", handlePressMove);
/* function handleMouseDown: handles pressing down the mouse button, starting the drawing */
function handleMouseDown(event) {
    startDraw(event);
}
/* function handleMouseOut: handles ending the drawing action if the mouse is moved outside of the whiteboard */
function handleMouseOut(event) {
    endDraw();
}
/* function handlePressUp: handles releasing the mouse button: ending the drawing. */
function handlePressUp(event) {
    endDraw();
}
/* function handlePressMove: handles moving the mouse while the mouse button is held, triggering drawing. */
function handlePressMove(event) {
    draw(event);
}
/* Reusable object used to draw on the whitebaord */
const shape = new createjs.Shape();
stage.addChild(whiteboard);
stage.addChild(shape);

updateStage();

console.debug("Done!");

/* function startDraw: sets the isDrawing flag to true and starts the painting action */
function startDraw(event) {
    let stroke;
    State.isDrawing = true;
    stroke = new Stroke(event.stageX, event.stageY, event.stageX, event.stageY);
    Network.sendDrawData(new DrawableObject(stroke, brush));
    drawObjectOnCanvas(new DrawableObject(stroke, brush));
    updateStage();
    State.prevX = event.stageX;
    State.prevY = event.stageY;
}
/* function draw: paints lines while the mouse is held and moved */
function draw(event) {
    if (State.isDrawing) {
        let stroke;
        stroke = new Stroke(State.prevX, State.prevY, event.stageX, event.stageY);
        Network.sendDrawData(new DrawableObject(stroke, brush));
        drawObjectOnCanvas(new DrawableObject(stroke, brush));
        updateStage();
        State.prevX = event.stageX;
        State.prevY = event.stageY;
    }
}
/* function endDraw: ends the drawing process */
function endDraw() {
    State.isDrawing = false;
}
/* function drawObject: draws the passed drawableobject onto the canvas */
function drawObjectOnCanvas(drawobj) {
    let b = drawobj.brush;
    let s = drawobj.stroke;
    shape.graphics.beginStroke(b.color)
        .setStrokeStyle(b.size, b.style)
        .moveTo(s.x1, s.y1)
        .lineTo(s.x2, s.y2);

}
/* function updateStage: updates the easelJS stage object to reflect changes */
function updateStage() {
    stage.update();
}


let name = "Guest"; /* User display name */
Network.connectToServer();

INPUT_COLOR.click(() => brush.color = INPUT_COLOR.val());
INPUT_SIZE.change(() => brush.size = parseInt(INPUT_SIZE.val()));