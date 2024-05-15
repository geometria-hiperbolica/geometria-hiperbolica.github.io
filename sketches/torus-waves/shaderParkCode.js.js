// Shader Park API available here:
// https://docs.shaderpark.com/references-js/

// Note: this function is treated as a string, so you will
// not be able to access constants you define outside this function
// Shader Park will convert this code into a shader for you.
function shaderParkCode() {
	//sphere(0.5);
	rotateX(-1);
	setStepSize(0.2);
  let buttonHover = 0.8  //input();
  let click = 0.6  //input();
  setStepSize(0.3);

  rotateY(time * 0.2);
  let warpedSpace = warpSpace(getSpace());
  metal(0.9);
  shine(1);
  color(1 - warpedSpace);
  torus(0.8, 0. + length(warpedSpace) * 0.2);
  expand(buttonHover * 0.08);

  function warpSpace(p) {
    let t = time / 4;
    rotateY(getRayDirection().y * (1 - click) * 4);
    p = getSpace().x * 2.0 * (vec3(0.5, 0.2, 0.1) + p);
    for (let i = 1.0; i < 3.0; i += 1.0) {
      p.x = p.x + buttonHover * sin(3.0 * t + i * 1.5 * p.y) + t * 0.5;
      p.y = p.x + buttonHover * cos(3.0 * t + i * 1.5 * p.x);
    }
    return 0.5 + 0.5 * cos(time + vec3(p.x, p.y, p.x) + vec3(0, 2, 4));
  }
}
