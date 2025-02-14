// src/memoize.js
function memoize(fn, options) {
  var cache = options && options.cache ? options.cache : cacheDefault;
  var serializer = options && options.serializer ? options.serializer : serializerDefault;
  var strategy = options && options.strategy ? options.strategy : strategyDefault;
  return strategy(fn, {
    cache,
    serializer
  });
}
function isPrimitive(value) {
  return value == null || typeof value === "number" || typeof value === "boolean";
}
function monadic(fn, cache, serializer, arg) {
  var cacheKey = isPrimitive(arg) ? arg : serializer(arg);
  var computedValue = cache.get(cacheKey);
  if (typeof computedValue === "undefined") {
    computedValue = fn.call(this, arg);
    cache.set(cacheKey, computedValue);
  }
  return computedValue;
}
function variadic(fn, cache, serializer) {
  var args = Array.prototype.slice.call(arguments, 3);
  var cacheKey = serializer(args);
  var computedValue = cache.get(cacheKey);
  if (typeof computedValue === "undefined") {
    computedValue = fn.apply(this, args);
    cache.set(cacheKey, computedValue);
  }
  return computedValue;
}
function assemble(fn, context, strategy, cache, serialize) {
  return strategy.bind(context, fn, cache, serialize);
}
function strategyDefault(fn, options) {
  var strategy = fn.length === 1 ? monadic : variadic;
  return assemble(fn, this, strategy, options.cache.create(), options.serializer);
}
function serializerDefault() {
  return JSON.stringify(arguments);
}
function ObjectWithoutPrototypeCache() {
  this.cache = Object.create(null);
}
ObjectWithoutPrototypeCache.prototype.has = function(key) {
  return key in this.cache;
};
ObjectWithoutPrototypeCache.prototype.get = function(key) {
  return this.cache[key];
};
ObjectWithoutPrototypeCache.prototype.set = function(key, value) {
  this.cache[key] = value;
};
var cacheDefault = {
  create: function create() {
    return new ObjectWithoutPrototypeCache();
  }
};
var memoize_default = memoize;

// src/index.ts
var DEFAULT_CLASS = {
  MAIN: "svelte-draggable",
  DRAGGING: "svelte-draggable-dragging",
  DRAGGED: "svelte-draggable-dragged"
};
var draggable = (node, options = {}) => {
  let {
    bounds,
    axis = "both",
    gpuAcceleration = true,
    applyUserSelectHack = true,
    disabled = false,
    grid,
    cancel,
    handle,
    defaultClass = DEFAULT_CLASS.MAIN,
    defaultClassDragging = DEFAULT_CLASS.DRAGGING,
    defaultClassDragged = DEFAULT_CLASS.DRAGGED,
    defaultPosition = { x: 0, y: 0 }
  } = options;
  let active = false;
  let [translateX, translateY] = [0, 0];
  let [initialX, initialY] = [0, 0];
  let [previousX, previousY] = [0, 0];
  let [clientToNodeOffsetX, clientToNodeOffsetY] = [0, 0];
  let [xOffset, yOffset] = [defaultPosition.x, defaultPosition.y];
  setTranslate(xOffset, yOffset, node, gpuAcceleration);
  let canMoveInX;
  let canMoveInY;
  let bodyOriginalUserSelectVal = "";
  let computedBounds;
  let nodeRect;
  let dragEl;
  let cancelEl;
  function fireSvelteDragStopEvent(node2) {
    node2.dispatchEvent(new CustomEvent("svelte-drag:end", { detail: { offsetX: translateX, offsetY: translateY } }));
  }
  function fireSvelteDragStartEvent(node2) {
    node2.dispatchEvent(new CustomEvent("svelte-drag:start", { detail: { offsetX: translateX, offsetY: translateY } }));
  }
  function fireSvelteDragEvent(node2, translateX2, translateY2) {
    node2.dispatchEvent(new CustomEvent("svelte-drag", { detail: { offsetX: translateX2, offsetY: translateY2 } }));
  }
  const listen = addEventListener;
  listen("touchstart", dragStart, false);
  listen("touchend", dragEnd, false);
  listen("touchmove", drag, false);
  listen("mousedown", dragStart, false);
  listen("mouseup", dragEnd, false);
  listen("mousemove", drag, false);
  node.style.touchAction = "none";
  function dragStart(e) {
    if (disabled)
      return;
    node.classList.add(defaultClass);
    dragEl = getDragEl(handle, node);
    cancelEl = getCancelElement(cancel, node);
    canMoveInX = ["both", "x"].includes(axis);
    canMoveInY = ["both", "y"].includes(axis);
    if (typeof bounds !== "undefined")
      computedBounds = computeBoundRect(bounds, node);
    nodeRect = node.getBoundingClientRect();
    if (isString(handle) && isString(cancel) && handle === cancel)
      throw new Error("`handle` selector can't be same as `cancel` selector");
    if (cancelEl == null ? void 0 : cancelEl.contains(dragEl))
      throw new Error("Element being dragged can't be a child of the element on which `cancel` is applied");
    if (dragEl.contains(e.target) && !(cancelEl == null ? void 0 : cancelEl.contains(e.target)))
      active = true;
    if (!active)
      return;
    if (applyUserSelectHack) {
      bodyOriginalUserSelectVal = document.body.style.userSelect;
      document.body.style.userSelect = "none";
    }
    fireSvelteDragStartEvent(node);
    const { clientX, clientY } = isTouchEvent(e) ? e.touches[0] : e;
    if (canMoveInX)
      initialX = clientX - xOffset;
    if (canMoveInY)
      initialY = clientY - yOffset;
    if (computedBounds) {
      clientToNodeOffsetX = clientX - nodeRect.left;
      clientToNodeOffsetY = clientY - nodeRect.top;
    }
  }
  function dragEnd(e) {
    if (disabled)
      return;
    if (!active)
      return;
    if (!node.contains(e.target))
      return;
    node.classList.remove(defaultClassDragging);
    node.classList.add(defaultClassDragged);
    if (applyUserSelectHack)
      document.body.style.userSelect = bodyOriginalUserSelectVal;
    fireSvelteDragStopEvent(node);
    if (canMoveInX)
      initialX = translateX;
    if (canMoveInX)
      initialY = translateY;
    active = false;
  }
  function drag(e) {
    if (disabled)
      return;
    if (!active)
      return;
    node.classList.add(defaultClassDragging);
    e.preventDefault();
    nodeRect = node.getBoundingClientRect();
    const { clientX, clientY } = isTouchEvent(e) ? e.touches[0] : e;
    let [finalX, finalY] = [clientX, clientY];
    if (computedBounds) {
      const virtualClientBounds = {
        left: computedBounds.left + clientToNodeOffsetX,
        top: computedBounds.top + clientToNodeOffsetY,
        right: computedBounds.right + clientToNodeOffsetX - nodeRect.width,
        bottom: computedBounds.bottom + clientToNodeOffsetY - nodeRect.height
      };
      finalX = Math.min(Math.max(finalX, virtualClientBounds.left), virtualClientBounds.right);
      finalY = Math.min(Math.max(finalY, virtualClientBounds.top), virtualClientBounds.bottom);
    }
    if (Array.isArray(grid)) {
      let [xSnap, ySnap] = grid;
      if (isNaN(+xSnap) || xSnap < 0)
        throw new Error("1st argument of `grid` must be a valid positive number");
      if (isNaN(+ySnap) || ySnap < 0)
        throw new Error("2nd argument of `grid` must be a valid positive number");
      let [deltaX, deltaY] = [finalX - previousX, finalY - previousY];
      [deltaX, deltaY] = snapToGrid([xSnap, ySnap], deltaX, deltaY);
      if (!deltaX && !deltaY)
        return;
      [finalX, finalY] = [previousX + deltaX, previousY + deltaY];
    }
    if (canMoveInX)
      translateX = finalX - initialX;
    if (canMoveInY)
      translateY = finalY - initialY;
    [xOffset, yOffset] = [translateX, translateY];
    fireSvelteDragEvent(node, translateX, translateY);
    Promise.resolve().then(() => setTranslate(translateX, translateY, node, gpuAcceleration));
  }
  return {
    destroy: () => {
      const unlisten = removeEventListener;
      unlisten("touchstart", dragStart, false);
      unlisten("touchend", dragEnd, false);
      unlisten("touchmove", drag, false);
      unlisten("mousedown", dragStart, false);
      unlisten("mouseup", dragEnd, false);
      unlisten("mousemove", drag, false);
    },
    update: (options2) => {
      var _a, _b, _c, _d, _e, _f;
      axis = options2.axis || "both";
      disabled = (_a = options2.disabled) != null ? _a : false;
      handle = options2.handle;
      bounds = options2.bounds;
      cancel = options2.cancel;
      applyUserSelectHack = (_b = options2.applyUserSelectHack) != null ? _b : true;
      grid = options2.grid;
      gpuAcceleration = (_c = options2.gpuAcceleration) != null ? _c : true;
      const dragged = node.classList.contains(defaultClassDragged);
      node.classList.remove(defaultClass, defaultClassDragged);
      defaultClass = (_d = options2.defaultClass) != null ? _d : DEFAULT_CLASS.MAIN;
      defaultClassDragging = (_e = options2.defaultClassDragging) != null ? _e : DEFAULT_CLASS.DRAGGING;
      defaultClassDragged = (_f = options2.defaultClassDragged) != null ? _f : DEFAULT_CLASS.DRAGGED;
      node.classList.add(defaultClass);
      if (dragged)
        node.classList.add(defaultClassDragged);
    }
  };
};
function isTouchEvent(event) {
  return Boolean(event.touches && event.touches.length);
}
function isString(val) {
  return typeof val === "string";
}
var snapToGrid = memoize_default(([xSnap, ySnap], pendingX, pendingY) => {
  const x = Math.round(pendingX / xSnap) * xSnap;
  const y = Math.round(pendingY / ySnap) * ySnap;
  return [x, y];
});
function getDragEl(handle, node) {
  if (!handle)
    return node;
  const handleEl = node.querySelector(handle);
  if (handleEl === null)
    throw new Error("Selector passed for `handle` option should be child of the element on which the action is applied");
  return handleEl;
}
function getCancelElement(cancel, node) {
  if (!cancel)
    return;
  const cancelEl = node.querySelector(cancel);
  if (cancelEl === null)
    throw new Error("Selector passed for `cancel` option should be child of the element on which the action is applied");
  return cancelEl;
}
function computeBoundRect(bounds, rootNode) {
  if (typeof bounds === "object") {
    const [windowWidth, windowHeight] = [window.innerWidth, window.innerHeight];
    const { top = 0, left = 0, right = 0, bottom = 0 } = bounds;
    const computedRight = windowWidth - right;
    const computedBottom = windowHeight - bottom;
    return { top, right: computedRight, bottom: computedBottom, left };
  }
  if (bounds === "parent")
    return rootNode.parentNode.getBoundingClientRect();
  const node = document.querySelector(bounds);
  if (node === null)
    throw new Error("The selector provided for bound doesn't exists in the document.");
  const computedBounds = node.getBoundingClientRect();
  return computedBounds;
}
function setTranslate(xPos, yPos, el, gpuAcceleration) {
  el.style.transform = gpuAcceleration ? `translate3d(${+xPos}px, ${+yPos}px, 0)` : `translate(${+xPos}px, ${+yPos}px)`;
}
export {
  draggable
};
//# sourceMappingURL=index.js.map
