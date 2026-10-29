'use strict';
// One responsive source set for static markup, gallery and service photographs.
window.SITE_IMAGES = Object.freeze({
  srcset(src, width = 1672) {
    return [480, 860, 1280, width].filter((size, index, list) => size <= width && list.indexOf(size) === index)
      .map(size => `${size === width ? src : src.replace(/\.webp$/, `-${size}.webp`)} ${size}w`).join(', ');
  },
  set(image, {src, width = 1672, height = 941, sizes = '100vw', alt = ''}) {
    image.width = width;
    image.height = height;
    image.decoding = 'async';
    image.sizes = sizes;
    image.srcset = this.srcset(src, width);
    image.src = src;
    image.alt = alt;
  }
});
