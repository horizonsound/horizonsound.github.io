window.autoplay = {
  get enabled() {
    return localStorage.getItem("autoplay") === "on";
  },
  set enabled(val) {
    localStorage.setItem("autoplay", val ? "on" : "off");
  }
};
