// Shader Park API available here:
// https://docs.shaderpark.com/references-js/

// Note: this function is treated as a string, so you will
// not be able to access constants you define outside this function
// Shader Park will convert this code into a shader for you.
function shaderParkCode() {
	let pace=.5;
	let ray = getRayDirection();
  let noiseScale = 5.0;
  let s = getSpace();
  let n = noise(s*noiseScale+vec3(0, 0, time) + noise(s*noiseScale+vec3(0, 0, time)));

  occlusion();
  color(vec3(n));
  reflectiveColor(vec3(10));

shine(.8);
let box1 = shape (() => {
  rotateY(time*pace);
  rotateX(time*pace);
  color(vec3(n)*.5+.5+normal*.5 + vec3(0, 0, 1));
  boxFrame(vec3(.4), .02);
});

let box2 = shape (() => {
  rotateX(time*pace);
  rotateZ(time*pace);
  color(vec3(n)*.5+.5+normal*.5 + vec3(0, 1, 0));
  boxFrame(vec3(.3), .02);
});

let box3 = shape (() => {
  rotateY(-time*pace);
  rotateZ(-time*pace);
  color(vec3(n)*.5+.5+normal*.5 + vec3(0, 1, 1));
  boxFrame(vec3(.2),.02);
});

box1();
box2();
box3();
}
