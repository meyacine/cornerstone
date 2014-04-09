
var cornerstone = (function (cornerstone) {

    "use strict";

    if(cornerstone === undefined) {
        cornerstone = {};
    }

    var renderCanvas = document.createElement('canvas');
    var renderCanvasContext;
    var renderCanvasData;

    function initializeRenderCanvas(image)
    {
        // Resize the canvas
        renderCanvas.width = image.width;
        renderCanvas.height = image.height;

        // NOTE - we need to fill the render canvas with white pixels since we control the luminance
        // using the alpha channel to improve rendering performance.
        renderCanvasContext = renderCanvas.getContext('2d');
        renderCanvasContext.fillStyle = 'white';
        renderCanvasContext.fillRect(0,0, renderCanvas.width, renderCanvas.height);
        renderCanvasData = renderCanvasContext.getImageData(0,0,image.width, image.height);
    }

    function getLut(image, viewport)
    {
        // if we have a cached lut and it has the right values, return it immediately
        if(image.lut !== undefined && image.lut.windowCenter === viewport.windowCenter && image.lut.windowWidth === viewport.windowWidth) {
            //console.log('using cached lut');
            return image.lut;
        }

        // lut is invalid or not present, regenerate it and cache it
        //console.log('generating lut');
        image.lut = cornerstone.generateLut(image, viewport.windowWidth, viewport.windowCenter, viewport.invert);
        image.lut.windowWidth = viewport.windowWidth;
        image.lut.windowCenter = viewport.windowCenter;
        return image.lut;
    }

    function drawImage(ee, image) {

        // get the canvas context and reset the transform
        var context = ee.canvas.getContext('2d');
        context.setTransform(1, 0, 0, 1, 0, 0);

        // clear the canvas
        context.fillStyle = 'black';
        context.fillRect(0,0, ee.canvas.width, ee.canvas.height);

        // If our render canvas does not match the size of this image reset it
        // NOTE: This will be inefficient if we are updating multiple images of different
        // sizes frequently, but I don't know how much...
        if(renderCanvas.width !== image.width || renderCanvas.height != image.height) {
            initializeRenderCanvas(image);
        }

        // save the canvas context state and apply the viewport properties
        context.save();
        cornerstone.setToPixelCoordinateSystem(ee, context);

        // generate the lut
        var lut = getLut(image, ee.viewport);

        // apply the lut to the stored pixel data onto the render canvas
        cornerstone.storedPixelDataToCanvasImageData(image, lut, renderCanvasData.data);
        renderCanvasContext.putImageData(renderCanvasData, 0, 0);

        var scaler = ee.viewport.scale;

        // Draw the render canvas half the image size (because we set origin to the middle of the canvas above)
        //context.webkitImageSmoothingEnabled = false;
        context.drawImage(renderCanvas, 0,0, image.columns, image.rows, 0, 0, image.columns, image.rows);

        context.restore();

        var event = new CustomEvent(
            "CornerstoneImageRendered",
            {
                detail: {
                    canvasContext: context,
                    viewport: ee.viewport,
                    image: ee.image,
                    element: ee.element,
                    enabledElement: ee,
                },
                bubbles: false,
                cancelable: false
            }
        );
        ee.element.dispatchEvent(event);
    }

    // Module exports
    cornerstone.drawImage = drawImage;

    return cornerstone;
}(cornerstone));