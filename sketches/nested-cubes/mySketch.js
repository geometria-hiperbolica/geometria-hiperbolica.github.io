/**
 * This combines p5 with Shader Park: https://shaderpark.com/
 * to draw via an SDF. Now that p5 has WebGL 2 support, you can
 * use Shader Park SDFs in p5 and even have your p5 shapes draw in front
 * of and behind them! Huge thanks to Dave Pagurek for his help on this!
 * 
 * If you want to try Shader Park in a p5 sketch of your own, make sure
 * to add this library to the list of enabled libraries on OpenProcessing:
 * https://cdn.jsdelivr.net/npm/shader-park-core/dist/shader-park-p5.js
 * - Torin Blankensmith, creator of Shader Park
 **/


let sdf;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
	pixelDensity(2); // increase for higher quality, decrease for speed
	// `createShaderPark` takes in a function that defines a shape using
	// the Shader Park API available here:
	// https://docs.shaderpark.com/references-js/
	// shaderParkCode is loaded in from shaderParkCode.js
	// Shader Park will convert the javascript into a shader for you
	
	sdf = createShaderPark(shaderParkCode, {
		//uniformly scale your entire shader park scene
		scale: 1, // reduce this value if your scene is cut off at the edges
		// control what geometry the shader gets applied to
		drawGeometry: () => sphere(160) // increase this value to enlarge the scene
	});
}

function draw() {
  //clear();
	background(255);
	noStroke();
	orbitControl();
	
	// The Shader Park distance field is drawn to an invisible sphere.
	// A good practice is to keep your coordinate space in Shader Park
	// close to (0, 0, 0) and then move the sdf around later on with P5
	
	scale(3);
	push();
  sdf.draw();
}


