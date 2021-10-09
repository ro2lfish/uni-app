export default function vueFactory(exports) {
  /**
   * Make a map and return a function for checking if a key
   * is in that map.
   * IMPORTANT: all calls of this function must be prefixed with
   * \/\*#\_\_PURE\_\_\*\/
   * So that rollup can tree-shake them if necessary.
   */
  Object.freeze({});
  Object.freeze([]);
  var extend$1 = Object.assign;

  var cacheStringFunction$1 = fn => {
    var cache = Object.create(null);
    return str => {
      var hit = cache[str];
      return hit || (cache[str] = fn(str));
    };
  };

  var camelizeRE$1 = /-(\w)/g;
  /**
   * @private
   */

  var camelize$1 = cacheStringFunction$1(str => {
    return str.replace(camelizeRE$1, (_, c) => c ? c.toUpperCase() : '');
  });
  var hyphenateRE$1 = /\B([A-Z])/g;
  /**
   * @private
   */

  var hyphenate$1 = cacheStringFunction$1(str => str.replace(hyphenateRE$1, '-$1').toLowerCase());
  /**
   * @private
   */

  var capitalize$1 = cacheStringFunction$1(str => str.charAt(0).toUpperCase() + str.slice(1));

  function isElement(el) {
    // Element
    return el.nodeType === 1;
  }

  function resolveOwnerEl(instance) {
    var {
      vnode
    } = instance;

    if (isElement(vnode.el)) {
      return vnode.el;
    }

    var {
      subTree
    } = instance; // ShapeFlags.ARRAY_CHILDREN = 1<<4

    if (subTree.shapeFlag & 16) {
      var elemVNode = subTree.children.find(vnode => isElement(vnode.el));

      if (elemVNode) {
        return elemVNode.el;
      }
    }

    return vnode.el;
  }

  var lastLogTime = 0;

  function formatLog(module, ...args) {
    var now = Date.now();
    var diff = lastLogTime ? now - lastLogTime : 0;
    lastLogTime = now;
    return "[".concat(now, "][").concat(diff, "ms][").concat(module, "]\uFF1A").concat(args.map(arg => JSON.stringify(arg)).join(' '));
  }

  class DOMException extends Error {
    constructor(message) {
      super(message);
      this.name = 'DOMException';
    }

  }

  function normalizeEventType(type, options) {
    if (options) {
      if (options.capture) {
        type += 'Capture';
      }

      if (options.once) {
        type += 'Once';
      }

      if (options.passive) {
        type += 'Passive';
      }
    }

    return "on".concat(capitalize$1(camelize$1(type)));
  }

  class UniEvent {
    constructor(type, opts) {
      this.defaultPrevented = false;
      this.timeStamp = Date.now();
      this._stop = false;
      this._end = false;
      this.type = type;
      this.bubbles = !!opts.bubbles;
      this.cancelable = !!opts.cancelable;
    }

    preventDefault() {
      this.defaultPrevented = true;
    }

    stopImmediatePropagation() {
      this._end = this._stop = true;
    }

    stopPropagation() {
      this._stop = true;
    }

  }

  function createUniEvent(evt) {
    if (evt instanceof UniEvent) {
      return evt;
    }

    var [type] = parseEventName(evt.type);
    var uniEvent = new UniEvent(type, {
      bubbles: false,
      cancelable: false
    });
    extend$1(uniEvent, evt);
    return uniEvent;
  }

  class UniEventTarget {
    constructor() {
      this.listeners = Object.create(null);
    }

    dispatchEvent(evt) {
      var listeners = this.listeners[evt.type];

      if (!listeners) {
        {
          console.error(formatLog('dispatchEvent', this.nodeId), evt.type, 'not found');
        }
        return false;
      } // 格式化事件类型


      var event = createUniEvent(evt);
      var len = listeners.length;

      for (var i = 0; i < len; i++) {
        listeners[i].call(this, event);

        if (event._end) {
          break;
        }
      }

      return event.cancelable && event.defaultPrevented;
    }

    addEventListener(type, listener, options) {
      type = normalizeEventType(type, options);
      (this.listeners[type] || (this.listeners[type] = [])).push(listener);
    }

    removeEventListener(type, callback, options) {
      type = normalizeEventType(type, options);
      var listeners = this.listeners[type];

      if (!listeners) {
        return;
      }

      var index = listeners.indexOf(callback);

      if (index > -1) {
        listeners.splice(index, 1);
      }
    }

  }

  var optionsModifierRE$1 = /(?:Once|Passive|Capture)$/;

  function parseEventName(name) {
    var options;

    if (optionsModifierRE$1.test(name)) {
      options = {};
      var m;

      while (m = name.match(optionsModifierRE$1)) {
        name = name.slice(0, name.length - m[0].length);
        options[m[0].toLowerCase()] = true;
      }
    }

    return [hyphenate$1(name.slice(2)), options];
  }

  var EventModifierFlags = {
    stop: 1,
    prevent: 1 << 1,
    self: 1 << 2
  };

  function encodeModifier(modifiers) {
    var flag = 0;

    if (modifiers.includes('stop')) {
      flag |= EventModifierFlags.stop;
    }

    if (modifiers.includes('prevent')) {
      flag |= EventModifierFlags.prevent;
    }

    if (modifiers.includes('self')) {
      flag |= EventModifierFlags.self;
    }

    return flag;
  }

  var NODE_TYPE_ELEMENT = 1;
  var NODE_TYPE_TEXT = 3;
  var NODE_TYPE_COMMENT = 8;

  function sibling(node, type) {
    var {
      parentNode
    } = node;

    if (!parentNode) {
      return null;
    }

    var {
      childNodes
    } = parentNode;
    return childNodes[childNodes.indexOf(node) + (type === 'n' ? 1 : -1)] || null;
  }

  function removeNode(node) {
    var {
      parentNode
    } = node;

    if (parentNode) {
      parentNode.removeChild(node);
    }
  }

  function checkNodeId(node) {
    if (!node.nodeId && node.pageNode) {
      node.nodeId = node.pageNode.genId();
    }
  } // 为优化性能，各平台不使用proxy来实现node的操作拦截，而是直接通过pageNode定制


  class UniNode extends UniEventTarget {
    constructor(nodeType, nodeName, container) {
      super();
      this.pageNode = null;
      this.parentNode = null;
      this._text = null;

      if (container) {
        var {
          pageNode
        } = container;

        if (pageNode) {
          this.pageNode = pageNode;
          this.nodeId = pageNode.genId();
          !pageNode.isUnmounted && pageNode.onCreate(this, nodeName);
        }
      }

      this.nodeType = nodeType;
      this.nodeName = nodeName;
      this.childNodes = [];
    }

    get firstChild() {
      return this.childNodes[0] || null;
    }

    get lastChild() {
      var {
        childNodes
      } = this;
      var length = childNodes.length;
      return length ? childNodes[length - 1] : null;
    }

    get nextSibling() {
      return sibling(this, 'n');
    }

    get nodeValue() {
      return null;
    }

    set nodeValue(_val) {}

    get textContent() {
      return this._text || '';
    }

    set textContent(text) {
      this._text = text;

      if (this.pageNode && !this.pageNode.isUnmounted) {
        this.pageNode.onTextContent(this, text);
      }
    }

    get parentElement() {
      var {
        parentNode
      } = this;

      if (parentNode && parentNode.nodeType === NODE_TYPE_ELEMENT) {
        return parentNode;
      }

      return null;
    }

    get previousSibling() {
      return sibling(this, 'p');
    }

    appendChild(newChild) {
      return this.insertBefore(newChild, null);
    }

    cloneNode(deep) {
      var cloned = extend$1(Object.create(Object.getPrototypeOf(this)), this);
      var {
        attributes
      } = cloned;

      if (attributes) {
        cloned.attributes = extend$1({}, attributes);
      }

      if (deep) {
        cloned.childNodes = cloned.childNodes.map(childNode => childNode.cloneNode(true));
      }

      return cloned;
    }

    insertBefore(newChild, refChild) {
      removeNode(newChild);
      newChild.pageNode = this.pageNode;
      newChild.parentNode = this;
      checkNodeId(newChild);
      var {
        childNodes
      } = this;

      if (refChild) {
        var index = childNodes.indexOf(refChild);

        if (index === -1) {
          throw new DOMException("Failed to execute 'insertBefore' on 'Node': The node before which the new node is to be inserted is not a child of this node.");
        }

        childNodes.splice(index, 0, newChild);
      } else {
        childNodes.push(newChild);
      }

      return this.pageNode && !this.pageNode.isUnmounted ? this.pageNode.onInsertBefore(this, newChild, refChild) : newChild;
    }

    removeChild(oldChild) {
      var {
        childNodes
      } = this;
      var index = childNodes.indexOf(oldChild);

      if (index === -1) {
        throw new DOMException("Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.");
      }

      oldChild.parentNode = null;
      childNodes.splice(index, 1);
      return this.pageNode && !this.pageNode.isUnmounted ? this.pageNode.onRemoveChild(oldChild) : oldChild;
    }

  }

  var ATTR_CLASS = 'class';
  var ATTR_STYLE = 'style';
  var ATTR_V_OWNER_ID = '.vOwnerId';
  var ATTR_V_RENDERJS = '.vRenderjs';

  class UniBaseNode extends UniNode {
    constructor(nodeType, nodeName, container) {
      super(nodeType, nodeName, container);
      this.attributes = Object.create(null);
      this.style = null;
      this.vShow = null;
      this._html = null;
    }

    get className() {
      return this.attributes[ATTR_CLASS] || '';
    }

    set className(val) {
      this.setAttribute(ATTR_CLASS, val);
    }

    get innerHTML() {
      return '';
    }

    set innerHTML(html) {
      this._html = html;
    }

    addEventListener(type, listener, options) {
      super.addEventListener(type, listener, options);

      if (this.pageNode && !this.pageNode.isUnmounted) {
        if (listener.wxsEvent) {
          this.pageNode.onAddWxsEvent(this, normalizeEventType(type, options), listener.wxsEvent, encodeModifier(listener.modifiers || []));
        } else {
          this.pageNode.onAddEvent(this, normalizeEventType(type, options), encodeModifier(listener.modifiers || []));
        }
      }
    }

    removeEventListener(type, callback, options) {
      super.removeEventListener(type, callback, options);

      if (this.pageNode && !this.pageNode.isUnmounted) {
        this.pageNode.onRemoveEvent(this, normalizeEventType(type, options));
      }
    }

    getAttribute(qualifiedName) {
      if (qualifiedName === ATTR_STYLE) {
        return this.style;
      }

      return this.attributes[qualifiedName];
    }

    removeAttribute(qualifiedName) {
      if (qualifiedName == ATTR_STYLE) {
        this.style = null;
      } else {
        delete this.attributes[qualifiedName];
      }

      if (this.pageNode && !this.pageNode.isUnmounted) {
        this.pageNode.onRemoveAttribute(this, qualifiedName);
      }
    }

    setAttribute(qualifiedName, value) {
      if (qualifiedName === ATTR_STYLE) {
        this.style = value;
      } else {
        this.attributes[qualifiedName] = value;
      }

      if (this.pageNode && !this.pageNode.isUnmounted) {
        this.pageNode.onSetAttribute(this, qualifiedName, value);
      }
    }

    toJSON({
      attr,
      normalize
    } = {}) {
      var {
        attributes,
        style,
        listeners,
        _text
      } = this;
      var res = {};

      if (Object.keys(attributes).length) {
        res.a = normalize ? normalize(attributes) : attributes;
      }

      var events = Object.keys(listeners);

      if (events.length) {
        var w = undefined;
        var e = {};
        events.forEach(name => {
          var handlers = listeners[name];

          if (handlers.length) {
            // 可能存在多个 handler 且不同 modifiers 吗？
            var {
              wxsEvent,
              modifiers
            } = handlers[0];
            var modifier = encodeModifier(modifiers || []);

            if (!wxsEvent) {
              e[name] = modifier;
            } else {
              if (!w) {
                w = {};
              }

              w[name] = [normalize ? normalize(wxsEvent) : wxsEvent, modifier];
            }
          }
        });
        res.e = normalize ? normalize(e, false) : e;

        if (w) {
          res.w = normalize ? normalize(w, false) : w;
        }
      }

      if (style !== null) {
        res.s = normalize ? normalize(style) : style;
      }

      if (!attr) {
        res.i = this.nodeId;
        res.n = this.nodeName;
      }

      if (_text !== null) {
        res.t = normalize ? normalize(_text) : _text;
      }

      return res;
    }

  }

  class UniCommentNode extends UniNode {
    constructor(text, container) {
      super(NODE_TYPE_COMMENT, '#comment', container);
      this._text = text;
    }

    toJSON(opts = {}) {
      // 暂时不传递 text 到 view 层，没啥意义，节省点数据量
      return opts.attr ? {} : {
        i: this.nodeId
      }; // return opts.attr
      //   ? { t: this._text as string }
      //   : {
      //       i: this.nodeId!,
      //       t: this._text as string,
      //     }
    }

  }

  class UniElement extends UniBaseNode {
    constructor(nodeName, container) {
      super(NODE_TYPE_ELEMENT, nodeName.toUpperCase(), container);
      this.tagName = this.nodeName;
    }

  }

  class UniInputElement extends UniElement {
    get value() {
      return this.getAttribute('value');
    }

    set value(val) {
      this.setAttribute('value', val);
    }

  }

  class UniTextAreaElement extends UniInputElement {}

  class UniTextNode extends UniBaseNode {
    constructor(text, container) {
      super(NODE_TYPE_TEXT, '#text', container);
      this._text = text;
    }

    get nodeValue() {
      return this._text || '';
    }

    set nodeValue(text) {
      this._text = text;

      if (this.pageNode && !this.pageNode.isUnmounted) {
        this.pageNode.onNodeValue(this, text);
      }
    }

  }

  var JSON_PROTOCOL = 'json://'; // lifecycle
  // App and Page

  var ON_SHOW = 'onShow';
  var ON_HIDE = 'onHide';
  var ON_BACK_PRESS = 'onBackPress';
  var ON_PAGE_SCROLL = 'onPageScroll';
  var ON_TAB_ITEM_TAP = 'onTabItemTap';
  var ON_REACH_BOTTOM = 'onReachBottom';
  var ON_PULL_DOWN_REFRESH = 'onPullDownRefresh';
  var PAGE_HOOKS = [ON_SHOW, ON_HIDE, ON_BACK_PRESS, ON_PAGE_SCROLL, ON_TAB_ITEM_TAP, ON_REACH_BOTTOM, ON_PULL_DOWN_REFRESH];

  function isRootHook(name) {
    return PAGE_HOOKS.indexOf(name) > -1;
  }
  /**
   * Make a map and return a function for checking if a key
   * is in that map.
   * IMPORTANT: all calls of this function must be prefixed with
   * \/\*#\_\_PURE\_\_\*\/
   * So that rollup can tree-shake them if necessary.
   */


  function makeMap(str, expectsLowerCase) {
    var map = Object.create(null);
    var list = str.split(',');

    for (var i = 0; i < list.length; i++) {
      map[list[i]] = true;
    }

    return expectsLowerCase ? val => !!map[val.toLowerCase()] : val => !!map[val];
  }

  var GLOBALS_WHITE_LISTED = 'Infinity,undefined,NaN,isFinite,isNaN,parseFloat,parseInt,decodeURI,' + 'decodeURIComponent,encodeURI,encodeURIComponent,Math,Number,Date,Array,' + 'Object,Boolean,String,RegExp,Map,Set,JSON,Intl,BigInt';
  var isGloballyWhitelisted = /*#__PURE__*/makeMap(GLOBALS_WHITE_LISTED);

  function normalizeStyle(value) {
    if (isArray(value)) {
      var res = {};

      for (var i = 0; i < value.length; i++) {
        var item = value[i];
        var normalized = isString(item) ? parseStringStyle(item) : normalizeStyle(item);

        if (normalized) {
          for (var key in normalized) {
            res[key] = normalized[key];
          }
        }
      }

      return res;
    } else if (isString(value)) {
      return value;
    } else if (isObject(value)) {
      return value;
    }
  }

  var listDelimiterRE = /;(?![^(]*\))/g;
  var propertyDelimiterRE = /:(.+)/;

  function parseStringStyle(cssText) {
    var ret = {};
    cssText.split(listDelimiterRE).forEach(item => {
      if (item) {
        var tmp = item.split(propertyDelimiterRE);
        tmp.length > 1 && (ret[tmp[0].trim()] = tmp[1].trim());
      }
    });
    return ret;
  }

  function normalizeClass(value) {
    var res = '';

    if (isString(value)) {
      res = value;
    } else if (isArray(value)) {
      for (var i = 0; i < value.length; i++) {
        var normalized = normalizeClass(value[i]);

        if (normalized) {
          res += normalized + ' ';
        }
      }
    } else if (isObject(value)) {
      for (var name in value) {
        if (value[name]) {
          res += name + ' ';
        }
      }
    }

    return res.trim();
  }

  function normalizeProps(props) {
    if (!props) return null;
    var {
      class: klass,
      style
    } = props;

    if (klass && !isString(klass)) {
      props.class = normalizeClass(klass);
    }

    if (style) {
      props.style = normalizeStyle(style);
    }

    return props;
  } // These tag configs are shared between compiler-dom and runtime-dom, so they
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Element


  var HTML_TAGS = 'html,body,base,head,link,meta,style,title,address,article,aside,footer,' + 'header,h1,h2,h3,h4,h5,h6,nav,section,div,dd,dl,dt,figcaption,' + 'figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,' + 'data,dfn,em,i,kbd,mark,q,rp,rt,ruby,s,samp,small,span,strong,sub,sup,' + 'time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,' + 'canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,' + 'th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,' + 'option,output,progress,select,textarea,details,dialog,menu,' + 'summary,template,blockquote,iframe,tfoot'; // https://developer.mozilla.org/en-US/docs/Web/SVG/Element

  var SVG_TAGS = 'svg,animate,animateMotion,animateTransform,circle,clipPath,color-profile,' + 'defs,desc,discard,ellipse,feBlend,feColorMatrix,feComponentTransfer,' + 'feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,' + 'feDistanceLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,' + 'feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,' + 'fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,' + 'foreignObject,g,hatch,hatchpath,image,line,linearGradient,marker,mask,' + 'mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern,' + 'polygon,polyline,radialGradient,rect,set,solidcolor,stop,switch,symbol,' + 'text,textPath,title,tspan,unknown,use,view';
  var isHTMLTag = /*#__PURE__*/makeMap(HTML_TAGS);
  var isSVGTag = /*#__PURE__*/makeMap(SVG_TAGS);
  /**
   * For converting {{ interpolation }} values to displayed strings.
   * @private
   */

  var toDisplayString = val => {
    return val == null ? '' : isArray(val) || isObject(val) && (val.toString === objectToString || !isFunction(val.toString)) ? JSON.stringify(val, replacer, 2) : String(val);
  };

  var replacer = (_key, val) => {
    // can't use isRef here since @vue/shared has no deps
    if (val && val.__v_isRef) {
      return replacer(_key, val.value);
    } else if (isMap(val)) {
      return {
        ["Map(".concat(val.size, ")")]: [...val.entries()].reduce((entries, [key, val]) => {
          entries["".concat(key, " =>")] = val;
          return entries;
        }, {})
      };
    } else if (isSet(val)) {
      return {
        ["Set(".concat(val.size, ")")]: [...val.values()]
      };
    } else if (isObject(val) && !isArray(val) && !isPlainObject(val)) {
      return String(val);
    }

    return val;
  };

  var EMPTY_OBJ = Object.freeze({});
  var EMPTY_ARR = Object.freeze([]);

  var NOOP = () => {};
  /**
   * Always return false.
   */


  var NO = () => false;

  var onRE = /^on[^a-z]/;

  var isOn = key => onRE.test(key);

  var isModelListener = key => key.startsWith('onUpdate:');

  var extend = Object.assign;

  var remove = (arr, el) => {
    var i = arr.indexOf(el);

    if (i > -1) {
      arr.splice(i, 1);
    }
  };

  var hasOwnProperty = Object.prototype.hasOwnProperty;

  var hasOwn = (val, key) => hasOwnProperty.call(val, key);

  var isArray = Array.isArray;

  var isMap = val => toTypeString(val) === '[object Map]';

  var isSet = val => toTypeString(val) === '[object Set]';

  var isFunction = val => typeof val === 'function';

  var isString = val => typeof val === 'string';

  var isSymbol = val => typeof val === 'symbol';

  var isObject = val => val !== null && typeof val === 'object';

  var isPromise = val => {
    return isObject(val) && isFunction(val.then) && isFunction(val.catch);
  };

  var objectToString = Object.prototype.toString;

  var toTypeString = value => objectToString.call(value);

  var toRawType = value => {
    // extract "RawType" from strings like "[object RawType]"
    return toTypeString(value).slice(8, -1);
  };

  var isPlainObject = val => toTypeString(val) === '[object Object]';

  var isIntegerKey = key => isString(key) && key !== 'NaN' && key[0] !== '-' && '' + parseInt(key, 10) === key;

  var isReservedProp = /*#__PURE__*/makeMap( // the leading comma is intentional so empty string "" is also included
  ',key,ref,' + 'onVnodeBeforeMount,onVnodeMounted,' + 'onVnodeBeforeUpdate,onVnodeUpdated,' + 'onVnodeBeforeUnmount,onVnodeUnmounted');

  var cacheStringFunction = fn => {
    var cache = Object.create(null);
    return str => {
      var hit = cache[str];
      return hit || (cache[str] = fn(str));
    };
  };

  var camelizeRE = /-(\w)/g;
  /**
   * @private
   */

  var camelize = cacheStringFunction(str => {
    return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : '');
  });
  var hyphenateRE = /\B([A-Z])/g;
  /**
   * @private
   */

  var hyphenate = cacheStringFunction(str => str.replace(hyphenateRE, '-$1').toLowerCase());
  /**
   * @private
   */

  var capitalize = cacheStringFunction(str => str.charAt(0).toUpperCase() + str.slice(1));
  /**
   * @private
   */

  var toHandlerKey = cacheStringFunction(str => str ? "on".concat(capitalize(str)) : ""); // compare whether a value has changed, accounting for NaN.

  var hasChanged = (value, oldValue) => !Object.is(value, oldValue);

  var invokeArrayFns = (fns, arg) => {
    for (var i = 0; i < fns.length; i++) {
      fns[i](arg);
    }
  };

  var def = (obj, key, value) => {
    Object.defineProperty(obj, key, {
      configurable: true,
      enumerable: false,
      value
    });
  };

  var toNumber = val => {
    var n = parseFloat(val);
    return isNaN(n) ? val : n;
  };

  var _globalThis;

  var getGlobalThis = () => {
    return _globalThis || (_globalThis = typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : typeof window !== 'undefined' ? window : {});
  };

  function warn(msg, ...args) {
    console.warn("[Vue warn] ".concat(msg), ...args);
  }

  var activeEffectScope;
  var effectScopeStack = [];

  class EffectScope {
    constructor(detached = false) {
      this.active = true;
      this.effects = [];
      this.cleanups = [];

      if (!detached && activeEffectScope) {
        this.parent = activeEffectScope;
        this.index = (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(this) - 1;
      }
    }

    run(fn) {
      if (this.active) {
        try {
          this.on();
          return fn();
        } finally {
          this.off();
        }
      } else {
        warn("cannot run an inactive effect scope.");
      }
    }

    on() {
      if (this.active) {
        effectScopeStack.push(this);
        activeEffectScope = this;
      }
    }

    off() {
      if (this.active) {
        effectScopeStack.pop();
        activeEffectScope = effectScopeStack[effectScopeStack.length - 1];
      }
    }

    stop(fromParent) {
      if (this.active) {
        this.effects.forEach(e => e.stop());
        this.cleanups.forEach(cleanup => cleanup());

        if (this.scopes) {
          this.scopes.forEach(e => e.stop(true));
        } // nested scope, dereference from parent to avoid memory leaks


        if (this.parent && !fromParent) {
          // optimized O(1) removal
          var last = this.parent.scopes.pop();

          if (last && last !== this) {
            this.parent.scopes[this.index] = last;
            last.index = this.index;
          }
        }

        this.active = false;
      }
    }

  }

  function effectScope(detached) {
    return new EffectScope(detached);
  }

  function recordEffectScope(effect, scope) {
    scope = scope || activeEffectScope;

    if (scope && scope.active) {
      scope.effects.push(effect);
    }
  }

  function getCurrentScope() {
    return activeEffectScope;
  }

  function onScopeDispose(fn) {
    if (activeEffectScope) {
      activeEffectScope.cleanups.push(fn);
    } else {
      warn("onScopeDispose() is called when there is no active effect scope" + " to be associated with.");
    }
  }

  var createDep = effects => {
    var dep = new Set(effects);
    dep.w = 0;
    dep.n = 0;
    return dep;
  };

  var wasTracked = dep => (dep.w & trackOpBit) > 0;

  var newTracked = dep => (dep.n & trackOpBit) > 0;

  var initDepMarkers = ({
    deps
  }) => {
    if (deps.length) {
      for (var i = 0; i < deps.length; i++) {
        deps[i].w |= trackOpBit; // set was tracked
      }
    }
  };

  var finalizeDepMarkers = effect => {
    var {
      deps
    } = effect;

    if (deps.length) {
      var ptr = 0;

      for (var i = 0; i < deps.length; i++) {
        var dep = deps[i];

        if (wasTracked(dep) && !newTracked(dep)) {
          dep.delete(effect);
        } else {
          deps[ptr++] = dep;
        } // clear bits


        dep.w &= ~trackOpBit;
        dep.n &= ~trackOpBit;
      }

      deps.length = ptr;
    }
  };

  var targetMap = new WeakMap(); // The number of effects currently being tracked recursively.

  var effectTrackDepth = 0;
  var trackOpBit = 1;
  /**
   * The bitwise track markers support at most 30 levels op recursion.
   * This value is chosen to enable modern JS engines to use a SMI on all platforms.
   * When recursion depth is greater, fall back to using a full cleanup.
   */

  var maxMarkerBits = 30;
  var effectStack = [];
  var activeEffect;
  var ITERATE_KEY = Symbol('iterate');
  var MAP_KEY_ITERATE_KEY = Symbol('Map key iterate');

  class ReactiveEffect {
    constructor(fn, scheduler = null, scope) {
      this.fn = fn;
      this.scheduler = scheduler;
      this.active = true;
      this.deps = [];
      recordEffectScope(this, scope);
    }

    run() {
      if (!this.active) {
        return this.fn();
      }

      if (!effectStack.includes(this)) {
        try {
          effectStack.push(activeEffect = this);
          enableTracking();
          trackOpBit = 1 << ++effectTrackDepth;

          if (effectTrackDepth <= maxMarkerBits) {
            initDepMarkers(this);
          } else {
            cleanupEffect(this);
          }

          return this.fn();
        } finally {
          if (effectTrackDepth <= maxMarkerBits) {
            finalizeDepMarkers(this);
          }

          trackOpBit = 1 << --effectTrackDepth;
          resetTracking();
          effectStack.pop();
          var n = effectStack.length;
          activeEffect = n > 0 ? effectStack[n - 1] : undefined;
        }
      }
    }

    stop() {
      if (this.active) {
        cleanupEffect(this);

        if (this.onStop) {
          this.onStop();
        }

        this.active = false;
      }
    }

  }

  function cleanupEffect(effect) {
    var {
      deps
    } = effect;

    if (deps.length) {
      for (var i = 0; i < deps.length; i++) {
        deps[i].delete(effect);
      }

      deps.length = 0;
    }
  }

  function effect(fn, options) {
    if (fn.effect) {
      fn = fn.effect.fn;
    }

    var _effect = new ReactiveEffect(fn);

    if (options) {
      extend(_effect, options);
      if (options.scope) recordEffectScope(_effect, options.scope);
    }

    if (!options || !options.lazy) {
      _effect.run();
    }

    var runner = _effect.run.bind(_effect);

    runner.effect = _effect;
    return runner;
  }

  function stop(runner) {
    runner.effect.stop();
  }

  var shouldTrack = true;
  var trackStack = [];

  function pauseTracking() {
    trackStack.push(shouldTrack);
    shouldTrack = false;
  }

  function enableTracking() {
    trackStack.push(shouldTrack);
    shouldTrack = true;
  }

  function resetTracking() {
    var last = trackStack.pop();
    shouldTrack = last === undefined ? true : last;
  }

  function track(target, type, key) {
    if (!isTracking()) {
      return;
    }

    var depsMap = targetMap.get(target);

    if (!depsMap) {
      targetMap.set(target, depsMap = new Map());
    }

    var dep = depsMap.get(key);

    if (!dep) {
      depsMap.set(key, dep = createDep());
    }

    var eventInfo = {
      effect: activeEffect,
      target,
      type,
      key
    };
    trackEffects(dep, eventInfo);
  }

  function isTracking() {
    return shouldTrack && activeEffect !== undefined;
  }

  function trackEffects(dep, debuggerEventExtraInfo) {
    var shouldTrack = false;

    if (effectTrackDepth <= maxMarkerBits) {
      if (!newTracked(dep)) {
        dep.n |= trackOpBit; // set newly tracked

        shouldTrack = !wasTracked(dep);
      }
    } else {
      // Full cleanup mode.
      shouldTrack = !dep.has(activeEffect);
    }

    if (shouldTrack) {
      dep.add(activeEffect);
      activeEffect.deps.push(dep);

      if (activeEffect.onTrack) {
        activeEffect.onTrack(Object.assign({
          effect: activeEffect
        }, debuggerEventExtraInfo));
      }
    }
  }

  function trigger(target, type, key, newValue, oldValue, oldTarget) {
    var depsMap = targetMap.get(target);

    if (!depsMap) {
      // never been tracked
      return;
    }

    var deps = [];

    if (type === "clear"
    /* CLEAR */
    ) {
      // collection being cleared
      // trigger all effects for target
      deps = [...depsMap.values()];
    } else if (key === 'length' && isArray(target)) {
      depsMap.forEach((dep, key) => {
        if (key === 'length' || key >= newValue) {
          deps.push(dep);
        }
      });
    } else {
      // schedule runs for SET | ADD | DELETE
      if (key !== void 0) {
        deps.push(depsMap.get(key));
      } // also run for iteration key on ADD | DELETE | Map.SET


      switch (type) {
        case "add"
        /* ADD */
        :
          if (!isArray(target)) {
            deps.push(depsMap.get(ITERATE_KEY));

            if (isMap(target)) {
              deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
            }
          } else if (isIntegerKey(key)) {
            // new index added to array -> length changes
            deps.push(depsMap.get('length'));
          }

          break;

        case "delete"
        /* DELETE */
        :
          if (!isArray(target)) {
            deps.push(depsMap.get(ITERATE_KEY));

            if (isMap(target)) {
              deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
            }
          }

          break;

        case "set"
        /* SET */
        :
          if (isMap(target)) {
            deps.push(depsMap.get(ITERATE_KEY));
          }

          break;
      }
    }

    var eventInfo = {
      target,
      type,
      key,
      newValue,
      oldValue,
      oldTarget
    };

    if (deps.length === 1) {
      if (deps[0]) {
        {
          triggerEffects(deps[0], eventInfo);
        }
      }
    } else {
      var effects = [];

      for (var dep of deps) {
        if (dep) {
          effects.push(...dep);
        }
      }

      {
        triggerEffects(createDep(effects), eventInfo);
      }
    }
  }

  function triggerEffects(dep, debuggerEventExtraInfo) {
    // spread into array for stabilization
    for (var _effect2 of isArray(dep) ? dep : [...dep]) {
      if (_effect2 !== activeEffect || _effect2.allowRecurse) {
        if (_effect2.onTrigger) {
          _effect2.onTrigger(extend({
            effect: _effect2
          }, debuggerEventExtraInfo));
        }

        if (_effect2.scheduler) {
          _effect2.scheduler();
        } else {
          _effect2.run();
        }
      }
    }
  }

  var isNonTrackableKeys = /*#__PURE__*/makeMap("__proto__,__v_isRef,__isVue");
  var builtInSymbols = new Set(Object.getOwnPropertyNames(Symbol).map(key => Symbol[key]).filter(isSymbol));
  var get = /*#__PURE__*/createGetter();
  var shallowGet = /*#__PURE__*/createGetter(false, true);
  var readonlyGet = /*#__PURE__*/createGetter(true);
  var shallowReadonlyGet = /*#__PURE__*/createGetter(true, true);
  var arrayInstrumentations = /*#__PURE__*/createArrayInstrumentations();

  function createArrayInstrumentations() {
    var instrumentations = {};
    ['includes', 'indexOf', 'lastIndexOf'].forEach(key => {
      instrumentations[key] = function (...args) {
        var arr = toRaw(this);

        for (var i = 0, l = this.length; i < l; i++) {
          track(arr, "get"
          /* GET */
          , i + '');
        } // we run the method using the original args first (which may be reactive)


        var res = arr[key](...args);

        if (res === -1 || res === false) {
          // if that didn't work, run it again using raw values.
          return arr[key](...args.map(toRaw));
        } else {
          return res;
        }
      };
    });
    ['push', 'pop', 'shift', 'unshift', 'splice'].forEach(key => {
      instrumentations[key] = function (...args) {
        pauseTracking();
        var res = toRaw(this)[key].apply(this, args);
        resetTracking();
        return res;
      };
    });
    return instrumentations;
  }

  function createGetter(isReadonly = false, shallow = false) {
    return function get(target, key, receiver) {
      if (key === "__v_isReactive"
      /* IS_REACTIVE */
      ) {
        return !isReadonly;
      } else if (key === "__v_isReadonly"
      /* IS_READONLY */
      ) {
        return isReadonly;
      } else if (key === "__v_raw"
      /* RAW */
      && receiver === (isReadonly ? shallow ? shallowReadonlyMap : readonlyMap : shallow ? shallowReactiveMap : reactiveMap).get(target)) {
        return target;
      }

      var targetIsArray = isArray(target);

      if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, receiver);
      }

      var res = Reflect.get(target, key, receiver);

      if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
        return res;
      }

      if (!isReadonly) {
        track(target, "get"
        /* GET */
        , key);
      }

      if (shallow) {
        return res;
      }

      if (isRef(res)) {
        // ref unwrapping - does not apply for Array + integer key.
        var shouldUnwrap = !targetIsArray || !isIntegerKey(key);
        return shouldUnwrap ? res.value : res;
      }

      if (isObject(res)) {
        // Convert returned value into a proxy as well. we do the isObject check
        // here to avoid invalid value warning. Also need to lazy access readonly
        // and reactive here to avoid circular dependency.
        return isReadonly ? readonly(res) : reactive(res);
      }

      return res;
    };
  }

  var set = /*#__PURE__*/createSetter();
  var shallowSet = /*#__PURE__*/createSetter(true);

  function createSetter(shallow = false) {
    return function set(target, key, value, receiver) {
      var oldValue = target[key];

      if (!shallow) {
        value = toRaw(value);
        oldValue = toRaw(oldValue);

        if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
          oldValue.value = value;
          return true;
        }
      }

      var hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
      var result = Reflect.set(target, key, value, receiver); // don't trigger if target is something up in the prototype chain of original

      if (target === toRaw(receiver)) {
        if (!hadKey) {
          trigger(target, "add"
          /* ADD */
          , key, value);
        } else if (hasChanged(value, oldValue)) {
          trigger(target, "set"
          /* SET */
          , key, value, oldValue);
        }
      }

      return result;
    };
  }

  function deleteProperty(target, key) {
    var hadKey = hasOwn(target, key);
    var oldValue = target[key];
    var result = Reflect.deleteProperty(target, key);

    if (result && hadKey) {
      trigger(target, "delete"
      /* DELETE */
      , key, undefined, oldValue);
    }

    return result;
  }

  function has(target, key) {
    var result = Reflect.has(target, key);

    if (!isSymbol(key) || !builtInSymbols.has(key)) {
      track(target, "has"
      /* HAS */
      , key);
    }

    return result;
  }

  function ownKeys(target) {
    track(target, "iterate"
    /* ITERATE */
    , isArray(target) ? 'length' : ITERATE_KEY);
    return Reflect.ownKeys(target);
  }

  var mutableHandlers = {
    get,
    set,
    deleteProperty,
    has,
    ownKeys
  };
  var readonlyHandlers = {
    get: readonlyGet,

    set(target, key) {
      {
        console.warn("Set operation on key \"".concat(String(key), "\" failed: target is readonly."), target);
      }
      return true;
    },

    deleteProperty(target, key) {
      {
        console.warn("Delete operation on key \"".concat(String(key), "\" failed: target is readonly."), target);
      }
      return true;
    }

  };
  var shallowReactiveHandlers = /*#__PURE__*/extend({}, mutableHandlers, {
    get: shallowGet,
    set: shallowSet
  }); // Props handlers are special in the sense that it should not unwrap top-level
  // refs (in order to allow refs to be explicitly passed down), but should
  // retain the reactivity of the normal readonly object.

  var shallowReadonlyHandlers = /*#__PURE__*/extend({}, readonlyHandlers, {
    get: shallowReadonlyGet
  });

  var toShallow = value => value;

  var getProto = v => Reflect.getPrototypeOf(v);

  function get$1(target, key, isReadonly = false, isShallow = false) {
    // #1772: readonly(reactive(Map)) should return readonly + reactive version
    // of the value
    target = target["__v_raw"
    /* RAW */
    ];
    var rawTarget = toRaw(target);
    var rawKey = toRaw(key);

    if (key !== rawKey) {
      !isReadonly && track(rawTarget, "get"
      /* GET */
      , key);
    }

    !isReadonly && track(rawTarget, "get"
    /* GET */
    , rawKey);
    var {
      has
    } = getProto(rawTarget);
    var wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;

    if (has.call(rawTarget, key)) {
      return wrap(target.get(key));
    } else if (has.call(rawTarget, rawKey)) {
      return wrap(target.get(rawKey));
    } else if (target !== rawTarget) {
      // #3602 readonly(reactive(Map))
      // ensure that the nested reactive `Map` can do tracking for itself
      target.get(key);
    }
  }

  function has$1(key, isReadonly = false) {
    var target = this["__v_raw"
    /* RAW */
    ];
    var rawTarget = toRaw(target);
    var rawKey = toRaw(key);

    if (key !== rawKey) {
      !isReadonly && track(rawTarget, "has"
      /* HAS */
      , key);
    }

    !isReadonly && track(rawTarget, "has"
    /* HAS */
    , rawKey);
    return key === rawKey ? target.has(key) : target.has(key) || target.has(rawKey);
  }

  function size(target, isReadonly = false) {
    target = target["__v_raw"
    /* RAW */
    ];
    !isReadonly && track(toRaw(target), "iterate"
    /* ITERATE */
    , ITERATE_KEY);
    return Reflect.get(target, 'size', target);
  }

  function add(value) {
    value = toRaw(value);
    var target = toRaw(this);
    var proto = getProto(target);
    var hadKey = proto.has.call(target, value);

    if (!hadKey) {
      target.add(value);
      trigger(target, "add"
      /* ADD */
      , value, value);
    }

    return this;
  }

  function set$1(key, value) {
    value = toRaw(value);
    var target = toRaw(this);
    var {
      has,
      get
    } = getProto(target);
    var hadKey = has.call(target, key);

    if (!hadKey) {
      key = toRaw(key);
      hadKey = has.call(target, key);
    } else {
      checkIdentityKeys(target, has, key);
    }

    var oldValue = get.call(target, key);
    target.set(key, value);

    if (!hadKey) {
      trigger(target, "add"
      /* ADD */
      , key, value);
    } else if (hasChanged(value, oldValue)) {
      trigger(target, "set"
      /* SET */
      , key, value, oldValue);
    }

    return this;
  }

  function deleteEntry(key) {
    var target = toRaw(this);
    var {
      has,
      get
    } = getProto(target);
    var hadKey = has.call(target, key);

    if (!hadKey) {
      key = toRaw(key);
      hadKey = has.call(target, key);
    } else {
      checkIdentityKeys(target, has, key);
    }

    var oldValue = get ? get.call(target, key) : undefined; // forward the operation before queueing reactions

    var result = target.delete(key);

    if (hadKey) {
      trigger(target, "delete"
      /* DELETE */
      , key, undefined, oldValue);
    }

    return result;
  }

  function clear() {
    var target = toRaw(this);
    var hadItems = target.size !== 0;
    var oldTarget = isMap(target) ? new Map(target) : new Set(target); // forward the operation before queueing reactions

    var result = target.clear();

    if (hadItems) {
      trigger(target, "clear"
      /* CLEAR */
      , undefined, undefined, oldTarget);
    }

    return result;
  }

  function createForEach(isReadonly, isShallow) {
    return function forEach(callback, thisArg) {
      var observed = this;
      var target = observed["__v_raw"
      /* RAW */
      ];
      var rawTarget = toRaw(target);
      var wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
      !isReadonly && track(rawTarget, "iterate"
      /* ITERATE */
      , ITERATE_KEY);
      return target.forEach((value, key) => {
        // important: make sure the callback is
        // 1. invoked with the reactive map as `this` and 3rd arg
        // 2. the value received should be a corresponding reactive/readonly.
        return callback.call(thisArg, wrap(value), wrap(key), observed);
      });
    };
  }

  function createIterableMethod(method, isReadonly, isShallow) {
    return function (...args) {
      var target = this["__v_raw"
      /* RAW */
      ];
      var rawTarget = toRaw(target);
      var targetIsMap = isMap(rawTarget);
      var isPair = method === 'entries' || method === Symbol.iterator && targetIsMap;
      var isKeyOnly = method === 'keys' && targetIsMap;
      var innerIterator = target[method](...args);
      var wrap = isShallow ? toShallow : isReadonly ? toReadonly : toReactive;
      !isReadonly && track(rawTarget, "iterate"
      /* ITERATE */
      , isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY); // return a wrapped iterator which returns observed versions of the
      // values emitted from the real iterator

      return {
        // iterator protocol
        next() {
          var {
            value,
            done
          } = innerIterator.next();
          return done ? {
            value,
            done
          } : {
            value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
            done
          };
        },

        // iterable protocol
        [Symbol.iterator]() {
          return this;
        }

      };
    };
  }

  function createReadonlyMethod(type) {
    return function (...args) {
      {
        var key = args[0] ? "on key \"".concat(args[0], "\" ") : "";
        console.warn("".concat(capitalize(type), " operation ").concat(key, "failed: target is readonly."), toRaw(this));
      }
      return type === "delete"
      /* DELETE */
      ? false : this;
    };
  }

  function createInstrumentations() {
    var mutableInstrumentations = {
      get(key) {
        return get$1(this, key);
      },

      get size() {
        return size(this);
      },

      has: has$1,
      add,
      set: set$1,
      delete: deleteEntry,
      clear,
      forEach: createForEach(false, false)
    };
    var shallowInstrumentations = {
      get(key) {
        return get$1(this, key, false, true);
      },

      get size() {
        return size(this);
      },

      has: has$1,
      add,
      set: set$1,
      delete: deleteEntry,
      clear,
      forEach: createForEach(false, true)
    };
    var readonlyInstrumentations = {
      get(key) {
        return get$1(this, key, true);
      },

      get size() {
        return size(this, true);
      },

      has(key) {
        return has$1.call(this, key, true);
      },

      add: createReadonlyMethod("add"
      /* ADD */
      ),
      set: createReadonlyMethod("set"
      /* SET */
      ),
      delete: createReadonlyMethod("delete"
      /* DELETE */
      ),
      clear: createReadonlyMethod("clear"
      /* CLEAR */
      ),
      forEach: createForEach(true, false)
    };
    var shallowReadonlyInstrumentations = {
      get(key) {
        return get$1(this, key, true, true);
      },

      get size() {
        return size(this, true);
      },

      has(key) {
        return has$1.call(this, key, true);
      },

      add: createReadonlyMethod("add"
      /* ADD */
      ),
      set: createReadonlyMethod("set"
      /* SET */
      ),
      delete: createReadonlyMethod("delete"
      /* DELETE */
      ),
      clear: createReadonlyMethod("clear"
      /* CLEAR */
      ),
      forEach: createForEach(true, true)
    };
    var iteratorMethods = ['keys', 'values', 'entries', Symbol.iterator];
    iteratorMethods.forEach(method => {
      mutableInstrumentations[method] = createIterableMethod(method, false, false);
      readonlyInstrumentations[method] = createIterableMethod(method, true, false);
      shallowInstrumentations[method] = createIterableMethod(method, false, true);
      shallowReadonlyInstrumentations[method] = createIterableMethod(method, true, true);
    });
    return [mutableInstrumentations, readonlyInstrumentations, shallowInstrumentations, shallowReadonlyInstrumentations];
  }

  var [mutableInstrumentations, readonlyInstrumentations, shallowInstrumentations, shallowReadonlyInstrumentations] = /* #__PURE__*/createInstrumentations();

  function createInstrumentationGetter(isReadonly, shallow) {
    var instrumentations = shallow ? isReadonly ? shallowReadonlyInstrumentations : shallowInstrumentations : isReadonly ? readonlyInstrumentations : mutableInstrumentations;
    return (target, key, receiver) => {
      if (key === "__v_isReactive"
      /* IS_REACTIVE */
      ) {
        return !isReadonly;
      } else if (key === "__v_isReadonly"
      /* IS_READONLY */
      ) {
        return isReadonly;
      } else if (key === "__v_raw"
      /* RAW */
      ) {
        return target;
      }

      return Reflect.get(hasOwn(instrumentations, key) && key in target ? instrumentations : target, key, receiver);
    };
  }

  var mutableCollectionHandlers = {
    get: /*#__PURE__*/createInstrumentationGetter(false, false)
  };
  var shallowCollectionHandlers = {
    get: /*#__PURE__*/createInstrumentationGetter(false, true)
  };
  var readonlyCollectionHandlers = {
    get: /*#__PURE__*/createInstrumentationGetter(true, false)
  };
  var shallowReadonlyCollectionHandlers = {
    get: /*#__PURE__*/createInstrumentationGetter(true, true)
  };

  function checkIdentityKeys(target, has, key) {
    var rawKey = toRaw(key);

    if (rawKey !== key && has.call(target, rawKey)) {
      var type = toRawType(target);
      console.warn("Reactive ".concat(type, " contains both the raw and reactive ") + "versions of the same object".concat(type === "Map" ? " as keys" : "", ", ") + "which can lead to inconsistencies. " + "Avoid differentiating between the raw and reactive versions " + "of an object and only use the reactive version if possible.");
    }
  }

  var reactiveMap = new WeakMap();
  var shallowReactiveMap = new WeakMap();
  var readonlyMap = new WeakMap();
  var shallowReadonlyMap = new WeakMap();

  function targetTypeMap(rawType) {
    switch (rawType) {
      case 'Object':
      case 'Array':
        return 1
        /* COMMON */
        ;

      case 'Map':
      case 'Set':
      case 'WeakMap':
      case 'WeakSet':
        return 2
        /* COLLECTION */
        ;

      default:
        return 0
        /* INVALID */
        ;
    }
  }

  function getTargetType(value) {
    return value["__v_skip"
    /* SKIP */
    ] || !Object.isExtensible(value) ? 0
    /* INVALID */
    : targetTypeMap(toRawType(value));
  }

  function reactive(target) {
    // if trying to observe a readonly proxy, return the readonly version.
    if (target && target["__v_isReadonly"
    /* IS_READONLY */
    ]) {
      return target;
    }

    return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers, reactiveMap);
  }
  /**
   * Return a shallowly-reactive copy of the original object, where only the root
   * level properties are reactive. It also does not auto-unwrap refs (even at the
   * root level).
   */


  function shallowReactive(target) {
    return createReactiveObject(target, false, shallowReactiveHandlers, shallowCollectionHandlers, shallowReactiveMap);
  }
  /**
   * Creates a readonly copy of the original object. Note the returned copy is not
   * made reactive, but `readonly` can be called on an already reactive object.
   */


  function readonly(target) {
    return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers, readonlyMap);
  }
  /**
   * Returns a reactive-copy of the original object, where only the root level
   * properties are readonly, and does NOT unwrap refs nor recursively convert
   * returned properties.
   * This is used for creating the props proxy object for stateful components.
   */


  function shallowReadonly(target) {
    return createReactiveObject(target, true, shallowReadonlyHandlers, shallowReadonlyCollectionHandlers, shallowReadonlyMap);
  }

  function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap) {
    if (!isObject(target)) {
      {
        console.warn("value cannot be made reactive: ".concat(String(target)));
      }
      return target;
    } // target is already a Proxy, return it.
    // exception: calling readonly() on a reactive object


    if (target["__v_raw"
    /* RAW */
    ] && !(isReadonly && target["__v_isReactive"
    /* IS_REACTIVE */
    ])) {
      return target;
    } // target already has corresponding Proxy


    var existingProxy = proxyMap.get(target);

    if (existingProxy) {
      return existingProxy;
    } // only a whitelist of value types can be observed.


    var targetType = getTargetType(target);

    if (targetType === 0
    /* INVALID */
    ) {
      return target;
    }

    var proxy = new Proxy(target, targetType === 2
    /* COLLECTION */
    ? collectionHandlers : baseHandlers);
    proxyMap.set(target, proxy);
    return proxy;
  }

  function isReactive(value) {
    if (isReadonly(value)) {
      return isReactive(value["__v_raw"
      /* RAW */
      ]);
    }

    return !!(value && value["__v_isReactive"
    /* IS_REACTIVE */
    ]);
  }

  function isReadonly(value) {
    return !!(value && value["__v_isReadonly"
    /* IS_READONLY */
    ]);
  }

  function isProxy(value) {
    return isReactive(value) || isReadonly(value);
  }

  function toRaw(observed) {
    var raw = observed && observed["__v_raw"
    /* RAW */
    ];
    return raw ? toRaw(raw) : observed;
  }

  function markRaw(value) {
    def(value, "__v_skip"
    /* SKIP */
    , true);
    return value;
  }

  var toReactive = value => isObject(value) ? reactive(value) : value;

  var toReadonly = value => isObject(value) ? readonly(value) : value;

  function trackRefValue(ref) {
    if (isTracking()) {
      ref = toRaw(ref);

      if (!ref.dep) {
        ref.dep = createDep();
      }

      {
        trackEffects(ref.dep, {
          target: ref,
          type: "get"
          /* GET */
          ,
          key: 'value'
        });
      }
    }
  }

  function triggerRefValue(ref, newVal) {
    ref = toRaw(ref);

    if (ref.dep) {
      {
        triggerEffects(ref.dep, {
          target: ref,
          type: "set"
          /* SET */
          ,
          key: 'value',
          newValue: newVal
        });
      }
    }
  }

  function isRef(r) {
    return Boolean(r && r.__v_isRef === true);
  }

  function ref(value) {
    return createRef(value, false);
  }

  function shallowRef(value) {
    return createRef(value, true);
  }

  function createRef(rawValue, shallow) {
    if (isRef(rawValue)) {
      return rawValue;
    }

    return new RefImpl(rawValue, shallow);
  }

  class RefImpl {
    constructor(value, _shallow) {
      this._shallow = _shallow;
      this.dep = undefined;
      this.__v_isRef = true;
      this._rawValue = _shallow ? value : toRaw(value);
      this._value = _shallow ? value : toReactive(value);
    }

    get value() {
      trackRefValue(this);
      return this._value;
    }

    set value(newVal) {
      newVal = this._shallow ? newVal : toRaw(newVal);

      if (hasChanged(newVal, this._rawValue)) {
        this._rawValue = newVal;
        this._value = this._shallow ? newVal : toReactive(newVal);
        triggerRefValue(this, newVal);
      }
    }

  }

  function triggerRef(ref) {
    triggerRefValue(ref, ref.value);
  }

  function unref(ref) {
    return isRef(ref) ? ref.value : ref;
  }

  var shallowUnwrapHandlers = {
    get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
    set: (target, key, value, receiver) => {
      var oldValue = target[key];

      if (isRef(oldValue) && !isRef(value)) {
        oldValue.value = value;
        return true;
      } else {
        return Reflect.set(target, key, value, receiver);
      }
    }
  };

  function proxyRefs(objectWithRefs) {
    return isReactive(objectWithRefs) ? objectWithRefs : new Proxy(objectWithRefs, shallowUnwrapHandlers);
  }

  class CustomRefImpl {
    constructor(factory) {
      this.dep = undefined;
      this.__v_isRef = true;
      var {
        get,
        set
      } = factory(() => trackRefValue(this), () => triggerRefValue(this));
      this._get = get;
      this._set = set;
    }

    get value() {
      return this._get();
    }

    set value(newVal) {
      this._set(newVal);
    }

  }

  function customRef(factory) {
    return new CustomRefImpl(factory);
  }

  function toRefs(object) {
    if (!isProxy(object)) {
      console.warn("toRefs() expects a reactive object but received a plain one.");
    }

    var ret = isArray(object) ? new Array(object.length) : {};

    for (var key in object) {
      ret[key] = toRef(object, key);
    }

    return ret;
  }

  class ObjectRefImpl {
    constructor(_object, _key) {
      this._object = _object;
      this._key = _key;
      this.__v_isRef = true;
    }

    get value() {
      return this._object[this._key];
    }

    set value(newVal) {
      this._object[this._key] = newVal;
    }

  }

  function toRef(object, key) {
    var val = object[key];
    return isRef(val) ? val : new ObjectRefImpl(object, key);
  }

  class ComputedRefImpl {
    constructor(getter, _setter, isReadonly) {
      this._setter = _setter;
      this.dep = undefined;
      this._dirty = true;
      this.__v_isRef = true;
      this.effect = new ReactiveEffect(getter, () => {
        if (!this._dirty) {
          this._dirty = true;
          triggerRefValue(this);
        }
      });
      this["__v_isReadonly"
      /* IS_READONLY */
      ] = isReadonly;
    }

    get value() {
      // the computed ref may get wrapped by other proxies e.g. readonly() #3376
      var self = toRaw(this);
      trackRefValue(self);

      if (self._dirty) {
        self._dirty = false;
        self._value = self.effect.run();
      }

      return self._value;
    }

    set value(newValue) {
      this._setter(newValue);
    }

  }

  function computed(getterOrOptions, debugOptions) {
    var getter;
    var setter;
    var onlyGetter = isFunction(getterOrOptions);

    if (onlyGetter) {
      getter = getterOrOptions;

      setter = () => {
        console.warn('Write operation failed: computed value is readonly');
      };
    } else {
      getter = getterOrOptions.get;
      setter = getterOrOptions.set;
    }

    var cRef = new ComputedRefImpl(getter, setter, onlyGetter || !setter);

    if (debugOptions) {
      cRef.effect.onTrack = debugOptions.onTrack;
      cRef.effect.onTrigger = debugOptions.onTrigger;
    }

    return cRef;
  }
  /* eslint-disable no-restricted-globals */


  var isHmrUpdating = false;
  var hmrDirtyComponents = new Set(); // Expose the HMR runtime on the window object
  // This makes it entirely tree-shakable without polluting the exports and makes
  // it easier to be used in toolings like vue-loader
  // Note: for a component to be eligible for HMR it also needs the __hmrId option
  // to be set so that its instances can be registered / removed.

  {
    getGlobalThis().__VUE_HMR_RUNTIME__ = {
      createRecord: tryWrap(createRecord),
      rerender: tryWrap(rerender),
      reload: tryWrap(reload)
    };
  }
  var map = new Map();

  function registerHMR(instance) {
    var id = instance.type.__hmrId;
    var record = map.get(id);

    if (!record) {
      createRecord(id, instance.type);
      record = map.get(id);
    }

    record.instances.add(instance);
  }

  function unregisterHMR(instance) {
    map.get(instance.type.__hmrId).instances.delete(instance);
  }

  function createRecord(id, initialDef) {
    if (map.has(id)) {
      return false;
    }

    map.set(id, {
      initialDef: normalizeClassComponent(initialDef),
      instances: new Set()
    });
    return true;
  }

  function normalizeClassComponent(component) {
    return isClassComponent(component) ? component.__vccOpts : component;
  }

  function rerender(id, newRender) {
    var record = map.get(id);

    if (!record) {
      return;
    } // update initial record (for not-yet-rendered component)


    record.initialDef.render = newRender;
    [...record.instances].forEach(instance => {
      if (newRender) {
        instance.render = newRender;
        normalizeClassComponent(instance.type).render = newRender;
      }

      instance.renderCache = []; // this flag forces child components with slot content to update

      isHmrUpdating = true;
      instance.update();
      isHmrUpdating = false;
    });
  }

  function reload(id, newComp) {
    var record = map.get(id);
    if (!record) return;
    newComp = normalizeClassComponent(newComp); // update initial def (for not-yet-rendered components)

    updateComponentDef(record.initialDef, newComp); // create a snapshot which avoids the set being mutated during updates

    var instances = [...record.instances];

    for (var instance of instances) {
      var oldComp = normalizeClassComponent(instance.type);

      if (!hmrDirtyComponents.has(oldComp)) {
        // 1. Update existing comp definition to match new one
        if (oldComp !== record.initialDef) {
          updateComponentDef(oldComp, newComp);
        } // 2. mark definition dirty. This forces the renderer to replace the
        // component on patch.


        hmrDirtyComponents.add(oldComp);
      } // 3. invalidate options resolution cache


      instance.appContext.optionsCache.delete(instance.type); // 4. actually update

      if (instance.ceReload) {
        // custom element
        hmrDirtyComponents.add(oldComp);
        instance.ceReload(newComp.styles);
        hmrDirtyComponents.delete(oldComp);
      } else if (instance.parent) {
        // 4. Force the parent instance to re-render. This will cause all updated
        // components to be unmounted and re-mounted. Queue the update so that we
        // don't end up forcing the same parent to re-render multiple times.
        queueJob(instance.parent.update); // instance is the inner component of an async custom element
        // invoke to reset styles

        if (instance.parent.type.__asyncLoader && instance.parent.ceReload) {
          instance.parent.ceReload(newComp.styles);
        }
      } else if (instance.appContext.reload) {
        // root instance mounted via createApp() has a reload method
        instance.appContext.reload();
      } else if (typeof window !== 'undefined') {
        // root instance inside tree created via raw render(). Force reload.
        window.location.reload();
      } else {
        console.warn('[HMR] Root or manually mounted instance modified. Full reload required.');
      }
    } // 5. make sure to cleanup dirty hmr components after update


    queuePostFlushCb(() => {
      for (var _instance of instances) {
        hmrDirtyComponents.delete(normalizeClassComponent(_instance.type));
      }
    });
  }

  function updateComponentDef(oldComp, newComp) {
    extend(oldComp, newComp);

    for (var key in oldComp) {
      if (key !== '__file' && !(key in newComp)) {
        delete oldComp[key];
      }
    }
  }

  function tryWrap(fn) {
    return (id, arg) => {
      try {
        return fn(id, arg);
      } catch (e) {
        console.error(e);
        console.warn("[HMR] Something went wrong during Vue component hot-reload. " + "Full reload required.");
      }
    };
  }

  var devtools;
  var buffer = [];

  function emit(event, ...args) {
    if (devtools) {
      devtools.emit(event, ...args);
    } else {
      buffer.push({
        event,
        args
      });
    }
  }

  function setDevtoolsHook(hook, target) {
    devtools = hook;

    if (devtools) {
      devtools.enabled = true;
      buffer.forEach(({
        event,
        args
      }) => devtools.emit(event, ...args));
      buffer = [];
    } else {
      var replay = target.__VUE_DEVTOOLS_HOOK_REPLAY__ = target.__VUE_DEVTOOLS_HOOK_REPLAY__ || [];
      replay.push(newHook => {
        setDevtoolsHook(newHook, target);
      }); // clear buffer after 3s - the user probably doesn't have devtools installed
      // at all, and keeping the buffer will cause memory leaks (#4738)

      setTimeout(() => {
        buffer = [];
      }, 3000);
    }
  }

  function devtoolsInitApp(app, version) {
    emit("app:init"
    /* APP_INIT */
    , app, version, {
      Fragment,
      Text,
      Comment,
      Static
    });
  }

  function devtoolsUnmountApp(app) {
    emit("app:unmount"
    /* APP_UNMOUNT */
    , app);
  }

  var devtoolsComponentAdded = /*#__PURE__*/createDevtoolsComponentHook("component:added"
  /* COMPONENT_ADDED */
  );
  var devtoolsComponentUpdated = /*#__PURE__*/createDevtoolsComponentHook("component:updated"
  /* COMPONENT_UPDATED */
  );
  var devtoolsComponentRemoved = /*#__PURE__*/createDevtoolsComponentHook("component:removed"
  /* COMPONENT_REMOVED */
  );

  function createDevtoolsComponentHook(hook) {
    return component => {
      emit(hook, component.appContext.app, component.uid, component.parent ? component.parent.uid : undefined, component);
    };
  }

  var devtoolsPerfStart = /*#__PURE__*/createDevtoolsPerformanceHook("perf:start"
  /* PERFORMANCE_START */
  );
  var devtoolsPerfEnd = /*#__PURE__*/createDevtoolsPerformanceHook("perf:end"
  /* PERFORMANCE_END */
  );

  function createDevtoolsPerformanceHook(hook) {
    return (component, type, time) => {
      emit(hook, component.appContext.app, component.uid, component, type, time);
    };
  }

  function devtoolsComponentEmit(component, event, params) {
    emit("component:emit"
    /* COMPONENT_EMIT */
    , component.appContext.app, component, event, params);
  }

  function emit$1(instance, event, ...rawArgs) {
    var props = instance.vnode.props || EMPTY_OBJ;
    {
      var {
        emitsOptions,
        propsOptions: [propsOptions]
      } = instance;

      if (emitsOptions) {
        if (!(event in emitsOptions) && !false) {
          if (!propsOptions || !(toHandlerKey(event) in propsOptions)) {
            warn$1("Component emitted event \"".concat(event, "\" but it is neither declared in ") + "the emits option nor as an \"".concat(toHandlerKey(event), "\" prop."));
          }
        } else {
          var validator = emitsOptions[event];

          if (isFunction(validator)) {
            var isValid = validator(...rawArgs);

            if (!isValid) {
              warn$1("Invalid event arguments: event validation failed for event \"".concat(event, "\"."));
            }
          }
        }
      }
    }
    var args = rawArgs;
    var isModelListener = event.startsWith('update:'); // for v-model update:xxx events, apply modifiers on args

    var modelArg = isModelListener && event.slice(7);

    if (modelArg && modelArg in props) {
      var modifiersKey = "".concat(modelArg === 'modelValue' ? 'model' : modelArg, "Modifiers");
      var {
        number,
        trim
      } = props[modifiersKey] || EMPTY_OBJ;

      if (trim) {
        args = rawArgs.map(a => a.trim());
      } else if (number) {
        args = rawArgs.map(toNumber);
      }
    }

    {
      devtoolsComponentEmit(instance, event, args);
    }
    {
      var lowerCaseEvent = event.toLowerCase();

      if (lowerCaseEvent !== event && props[toHandlerKey(lowerCaseEvent)]) {
        warn$1("Event \"".concat(lowerCaseEvent, "\" is emitted in component ") + "".concat(formatComponentName(instance, instance.type), " but the handler is registered for \"").concat(event, "\". ") + "Note that HTML attributes are case-insensitive and you cannot use " + "v-on to listen to camelCase events when using in-DOM templates. " + "You should probably use \"".concat(hyphenate(event), "\" instead of \"").concat(event, "\"."));
      }
    }
    var handlerName;
    var handler = props[handlerName = toHandlerKey(event)] || // also try camelCase event handler (#2249)
    props[handlerName = toHandlerKey(camelize(event))]; // for v-model update:xxx events, also trigger kebab-case equivalent
    // for props passed via kebab-case

    if (!handler && isModelListener) {
      handler = props[handlerName = toHandlerKey(hyphenate(event))];
    }

    if (handler) {
      callWithAsyncErrorHandling(handler, instance, 6
      /* COMPONENT_EVENT_HANDLER */
      , args);
    }

    var onceHandler = props[handlerName + "Once"];

    if (onceHandler) {
      if (!instance.emitted) {
        instance.emitted = {};
      } else if (instance.emitted[handlerName]) {
        return;
      }

      instance.emitted[handlerName] = true;
      callWithAsyncErrorHandling(onceHandler, instance, 6
      /* COMPONENT_EVENT_HANDLER */
      , args);
    }
  }

  function normalizeEmitsOptions(comp, appContext, asMixin = false) {
    var cache = appContext.emitsCache;
    var cached = cache.get(comp);

    if (cached !== undefined) {
      return cached;
    }

    var raw = comp.emits;
    var normalized = {}; // apply mixin/extends props

    var hasExtends = false;

    if (!isFunction(comp)) {
      var extendEmits = raw => {
        var normalizedFromExtend = normalizeEmitsOptions(raw, appContext, true);

        if (normalizedFromExtend) {
          hasExtends = true;
          extend(normalized, normalizedFromExtend);
        }
      };

      if (!asMixin && appContext.mixins.length) {
        appContext.mixins.forEach(extendEmits);
      }

      if (comp.extends) {
        extendEmits(comp.extends);
      }

      if (comp.mixins) {
        comp.mixins.forEach(extendEmits);
      }
    }

    if (!raw && !hasExtends) {
      cache.set(comp, null);
      return null;
    }

    if (isArray(raw)) {
      raw.forEach(key => normalized[key] = null);
    } else {
      extend(normalized, raw);
    }

    cache.set(comp, normalized);
    return normalized;
  } // Check if an incoming prop key is a declared emit event listener.
  // e.g. With `emits: { click: null }`, props named `onClick` and `onclick` are
  // both considered matched listeners.


  function isEmitListener(options, key) {
    if (!options || !isOn(key)) {
      return false;
    }

    key = key.slice(2).replace(/Once$/, '');
    return hasOwn(options, key[0].toLowerCase() + key.slice(1)) || hasOwn(options, hyphenate(key)) || hasOwn(options, key);
  }
  /**
   * mark the current rendering instance for asset resolution (e.g.
   * resolveComponent, resolveDirective) during render
   */


  var currentRenderingInstance = null;
  var currentScopeId = null;
  /**
   * Note: rendering calls maybe nested. The function returns the parent rendering
   * instance if present, which should be restored after the render is done:
   *
   * ```js
   * const prev = setCurrentRenderingInstance(i)
   * // ...render
   * setCurrentRenderingInstance(prev)
   * ```
   */

  function setCurrentRenderingInstance(instance) {
    var prev = currentRenderingInstance;
    currentRenderingInstance = instance;
    currentScopeId = instance && instance.type.__scopeId || null;
    return prev;
  }
  /**
   * Set scope id when creating hoisted vnodes.
   * @private compiler helper
   */


  function pushScopeId(id) {
    currentScopeId = id;
  }
  /**
   * Technically we no longer need this after 3.0.8 but we need to keep the same
   * API for backwards compat w/ code generated by compilers.
   * @private
   */


  function popScopeId() {
    currentScopeId = null;
  }
  /**
   * Only for backwards compat
   * @private
   */


  var withScopeId = _id => withCtx;
  /**
   * Wrap a slot function to memoize current rendering instance
   * @private compiler helper
   */


  function withCtx(fn, ctx = currentRenderingInstance, isNonScopedSlot // false only
  ) {
    if (!ctx) return fn; // already normalized

    if (fn._n) {
      return fn;
    }

    var renderFnWithContext = (...args) => {
      // If a user calls a compiled slot inside a template expression (#1745), it
      // can mess up block tracking, so by default we disable block tracking and
      // force bail out when invoking a compiled slot (indicated by the ._d flag).
      // This isn't necessary if rendering a compiled `<slot>`, so we flip the
      // ._d flag off when invoking the wrapped fn inside `renderSlot`.
      if (renderFnWithContext._d) {
        setBlockTracking(-1);
      }

      var prevInstance = setCurrentRenderingInstance(ctx);
      var res = fn(...args);
      setCurrentRenderingInstance(prevInstance);

      if (renderFnWithContext._d) {
        setBlockTracking(1);
      }

      {
        devtoolsComponentUpdated(ctx);
      }
      return res;
    }; // mark normalized to avoid duplicated wrapping


    renderFnWithContext._n = true; // mark this as compiled by default
    // this is used in vnode.ts -> normalizeChildren() to set the slot
    // rendering flag.

    renderFnWithContext._c = true; // disable block tracking by default

    renderFnWithContext._d = true;
    return renderFnWithContext;
  }
  /**
   * dev only flag to track whether $attrs was used during render.
   * If $attrs was used during render then the warning for failed attrs
   * fallthrough can be suppressed.
   */


  var accessedAttrs = false;

  function markAttrsAccessed() {
    accessedAttrs = true;
  }

  function renderComponentRoot(instance) {
    var {
      type: Component,
      vnode,
      proxy,
      withProxy,
      props,
      propsOptions: [propsOptions],
      slots,
      attrs,
      emit,
      render,
      renderCache,
      data,
      setupState,
      ctx,
      inheritAttrs
    } = instance;
    var result;
    var fallthroughAttrs;
    var prev = setCurrentRenderingInstance(instance);
    {
      accessedAttrs = false;
    }

    try {
      if (vnode.shapeFlag & 4
      /* STATEFUL_COMPONENT */
      ) {
        // withProxy is a proxy with a different `has` trap only for
        // runtime-compiled render functions using `with` block.
        var proxyToUse = withProxy || proxy;
        result = normalizeVNode(render.call(proxyToUse, proxyToUse, renderCache, props, setupState, data, ctx));
        fallthroughAttrs = attrs;
      } else {
        // functional
        var _render = Component; // in dev, mark attrs accessed if optional props (attrs === props)

        if ("development" !== 'production' && attrs === props) {
          markAttrsAccessed();
        }

        result = normalizeVNode(_render.length > 1 ? _render(props, "development" !== 'production' ? {
          get attrs() {
            markAttrsAccessed();
            return attrs;
          },

          slots,
          emit
        } : {
          attrs,
          slots,
          emit
        }) : _render(props, null
        /* we know it doesn't need it */
        ));
        fallthroughAttrs = Component.props ? attrs : getFunctionalFallthrough(attrs);
      }
    } catch (err) {
      blockStack.length = 0;
      handleError(err, instance, 1
      /* RENDER_FUNCTION */
      );
      result = createVNode(Comment);
    } // attr merging
    // in dev mode, comments are preserved, and it's possible for a template
    // to have comments along side the root element which makes it a fragment


    var root = result;
    var setRoot = undefined;

    if (result.patchFlag > 0 && result.patchFlag & 2048
    /* DEV_ROOT_FRAGMENT */
    ) {
      [root, setRoot] = getChildRoot(result);
    }

    if (fallthroughAttrs && inheritAttrs !== false) {
      var keys = Object.keys(fallthroughAttrs);
      var {
        shapeFlag
      } = root;

      if (keys.length) {
        if (shapeFlag & (1
        /* ELEMENT */
        | 6
        /* COMPONENT */
        )) {
          if (propsOptions && keys.some(isModelListener)) {
            // If a v-model listener (onUpdate:xxx) has a corresponding declared
            // prop, it indicates this component expects to handle v-model and
            // it should not fallthrough.
            // related: #1543, #1643, #1989
            fallthroughAttrs = filterModelListeners(fallthroughAttrs, propsOptions);
          }

          root = cloneVNode(root, fallthroughAttrs);
        } else if (!accessedAttrs && root.type !== Comment) {
          var allAttrs = Object.keys(attrs);
          var eventAttrs = [];
          var extraAttrs = [];

          for (var i = 0, l = allAttrs.length; i < l; i++) {
            var key = allAttrs[i];

            if (isOn(key)) {
              // ignore v-model handlers when they fail to fallthrough
              if (!isModelListener(key)) {
                // remove `on`, lowercase first letter to reflect event casing
                // accurately
                eventAttrs.push(key[2].toLowerCase() + key.slice(3));
              }
            } else {
              extraAttrs.push(key);
            }
          }

          if (extraAttrs.length) {
            warn$1("Extraneous non-props attributes (" + "".concat(extraAttrs.join(', '), ") ") + "were passed to component but could not be automatically inherited " + "because component renders fragment or text root nodes.");
          }

          if (eventAttrs.length) {
            warn$1("Extraneous non-emits event listeners (" + "".concat(eventAttrs.join(', '), ") ") + "were passed to component but could not be automatically inherited " + "because component renders fragment or text root nodes. " + "If the listener is intended to be a component custom event listener only, " + "declare it using the \"emits\" option.");
          }
        }
      }
    } // inherit directives


    if (vnode.dirs) {
      if (!isElementRoot(root)) {
        warn$1("Runtime directive used on component with non-element root node. " + "The directives will not function as intended.");
      }

      root.dirs = root.dirs ? root.dirs.concat(vnode.dirs) : vnode.dirs;
    } // inherit transition data


    if (vnode.transition) {
      if (!isElementRoot(root)) {
        warn$1("Component inside <Transition> renders non-element root node " + "that cannot be animated.");
      }

      root.transition = vnode.transition;
    }

    if (setRoot) {
      setRoot(root);
    } else {
      result = root;
    }

    setCurrentRenderingInstance(prev);
    return result;
  }
  /**
   * dev only
   * In dev mode, template root level comments are rendered, which turns the
   * template into a fragment root, but we need to locate the single element
   * root for attrs and scope id processing.
   */


  var getChildRoot = vnode => {
    var rawChildren = vnode.children;
    var dynamicChildren = vnode.dynamicChildren;
    var childRoot = filterSingleRoot(rawChildren);

    if (!childRoot) {
      return [vnode, undefined];
    }

    var index = rawChildren.indexOf(childRoot);
    var dynamicIndex = dynamicChildren ? dynamicChildren.indexOf(childRoot) : -1;

    var setRoot = updatedRoot => {
      rawChildren[index] = updatedRoot;

      if (dynamicChildren) {
        if (dynamicIndex > -1) {
          dynamicChildren[dynamicIndex] = updatedRoot;
        } else if (updatedRoot.patchFlag > 0) {
          vnode.dynamicChildren = [...dynamicChildren, updatedRoot];
        }
      }
    };

    return [normalizeVNode(childRoot), setRoot];
  };

  function filterSingleRoot(children) {
    var singleRoot;

    for (var i = 0; i < children.length; i++) {
      var child = children[i];

      if (isVNode(child)) {
        // ignore user comment
        if (child.type !== Comment || child.children === 'v-if') {
          if (singleRoot) {
            // has more than 1 non-comment child, return now
            return;
          } else {
            singleRoot = child;
          }
        }
      } else {
        return;
      }
    }

    return singleRoot;
  }

  var getFunctionalFallthrough = attrs => {
    var res;

    for (var key in attrs) {
      if (key === 'class' || key === 'style' || isOn(key)) {
        (res || (res = {}))[key] = attrs[key];
      }
    }

    return res;
  };

  var filterModelListeners = (attrs, props) => {
    var res = {};

    for (var key in attrs) {
      if (!isModelListener(key) || !(key.slice(9) in props)) {
        res[key] = attrs[key];
      }
    }

    return res;
  };

  var isElementRoot = vnode => {
    return vnode.shapeFlag & (6
    /* COMPONENT */
    | 1
    /* ELEMENT */
    ) || vnode.type === Comment // potential v-if branch switch
    ;
  };

  function shouldUpdateComponent(prevVNode, nextVNode, optimized) {
    var {
      props: prevProps,
      children: prevChildren,
      component
    } = prevVNode;
    var {
      props: nextProps,
      children: nextChildren,
      patchFlag
    } = nextVNode;
    var emits = component.emitsOptions; // Parent component's render function was hot-updated. Since this may have
    // caused the child component's slots content to have changed, we need to
    // force the child to update as well.

    if ((prevChildren || nextChildren) && isHmrUpdating) {
      return true;
    } // force child update for runtime directive or transition on component vnode.


    if (nextVNode.dirs || nextVNode.transition) {
      return true;
    }

    if (optimized && patchFlag >= 0) {
      if (patchFlag & 1024
      /* DYNAMIC_SLOTS */
      ) {
        // slot content that references values that might have changed,
        // e.g. in a v-for
        return true;
      }

      if (patchFlag & 16
      /* FULL_PROPS */
      ) {
        if (!prevProps) {
          return !!nextProps;
        } // presence of this flag indicates props are always non-null


        return hasPropsChanged(prevProps, nextProps, emits);
      } else if (patchFlag & 8
      /* PROPS */
      ) {
        var dynamicProps = nextVNode.dynamicProps;

        for (var i = 0; i < dynamicProps.length; i++) {
          var key = dynamicProps[i];

          if (nextProps[key] !== prevProps[key] && !isEmitListener(emits, key)) {
            return true;
          }
        }
      }
    } else {
      // this path is only taken by manually written render functions
      // so presence of any children leads to a forced update
      if (prevChildren || nextChildren) {
        if (!nextChildren || !nextChildren.$stable) {
          return true;
        }
      }

      if (prevProps === nextProps) {
        return false;
      }

      if (!prevProps) {
        return !!nextProps;
      }

      if (!nextProps) {
        return true;
      }

      return hasPropsChanged(prevProps, nextProps, emits);
    }

    return false;
  }

  function hasPropsChanged(prevProps, nextProps, emitsOptions) {
    var nextKeys = Object.keys(nextProps);

    if (nextKeys.length !== Object.keys(prevProps).length) {
      return true;
    }

    for (var i = 0; i < nextKeys.length; i++) {
      var key = nextKeys[i];

      if (nextProps[key] !== prevProps[key] && !isEmitListener(emitsOptions, key)) {
        return true;
      }
    }

    return false;
  }

  function updateHOCHostEl({
    vnode,
    parent
  }, el // HostNode
  ) {
    while (parent && parent.subTree === vnode) {
      (vnode = parent.vnode).el = el;
      parent = parent.parent;
    }
  }

  var isSuspense = type => type.__isSuspense; // Suspense exposes a component-like API, and is treated like a component
  // in the compiler, but internally it's a special built-in type that hooks
  // directly into the renderer.


  var SuspenseImpl = {
    name: 'Suspense',
    // In order to make Suspense tree-shakable, we need to avoid importing it
    // directly in the renderer. The renderer checks for the __isSuspense flag
    // on a vnode's type and calls the `process` method, passing in renderer
    // internals.
    __isSuspense: true,

    process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, // platform-specific impl passed from renderer
    rendererInternals) {
      if (n1 == null) {
        mountSuspense(n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, rendererInternals);
      } else {
        patchSuspense(n1, n2, container, anchor, parentComponent, isSVG, slotScopeIds, optimized, rendererInternals);
      }
    },

    hydrate: hydrateSuspense,
    create: createSuspenseBoundary,
    normalize: normalizeSuspenseChildren
  }; // Force-casted public typing for h and TSX props inference

  var Suspense = SuspenseImpl;

  function triggerEvent(vnode, name) {
    var eventListener = vnode.props && vnode.props[name];

    if (isFunction(eventListener)) {
      eventListener();
    }
  }

  function mountSuspense(vnode, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, rendererInternals) {
    var {
      p: patch,
      o: {
        createElement
      }
    } = rendererInternals;
    var hiddenContainer = createElement('div', container); // fixed by xxxxxx

    var suspense = vnode.suspense = createSuspenseBoundary(vnode, parentSuspense, parentComponent, container, hiddenContainer, anchor, isSVG, slotScopeIds, optimized, rendererInternals); // start mounting the content subtree in an off-dom container

    patch(null, suspense.pendingBranch = vnode.ssContent, hiddenContainer, null, parentComponent, suspense, isSVG, slotScopeIds); // now check if we have encountered any async deps

    if (suspense.deps > 0) {
      // has async
      // invoke @fallback event
      triggerEvent(vnode, 'onPending');
      triggerEvent(vnode, 'onFallback'); // mount the fallback tree

      patch(null, vnode.ssFallback, container, anchor, parentComponent, null, // fallback tree will not have suspense context
      isSVG, slotScopeIds);
      setActiveBranch(suspense, vnode.ssFallback);
    } else {
      // Suspense has no async deps. Just resolve.
      suspense.resolve();
    }
  }

  function patchSuspense(n1, n2, container, anchor, parentComponent, isSVG, slotScopeIds, optimized, {
    p: patch,
    um: unmount,
    o: {
      createElement
    }
  }) {
    var suspense = n2.suspense = n1.suspense;
    suspense.vnode = n2;
    n2.el = n1.el;
    var newBranch = n2.ssContent;
    var newFallback = n2.ssFallback;
    var {
      activeBranch,
      pendingBranch,
      isInFallback,
      isHydrating
    } = suspense;

    if (pendingBranch) {
      suspense.pendingBranch = newBranch;

      if (isSameVNodeType(newBranch, pendingBranch)) {
        // same root type but content may have changed.
        patch(pendingBranch, newBranch, suspense.hiddenContainer, null, parentComponent, suspense, isSVG, slotScopeIds, optimized);

        if (suspense.deps <= 0) {
          suspense.resolve();
        } else if (isInFallback) {
          patch(activeBranch, newFallback, container, anchor, parentComponent, null, // fallback tree will not have suspense context
          isSVG, slotScopeIds, optimized);
          setActiveBranch(suspense, newFallback);
        }
      } else {
        // toggled before pending tree is resolved
        suspense.pendingId++;

        if (isHydrating) {
          // if toggled before hydration is finished, the current DOM tree is
          // no longer valid. set it as the active branch so it will be unmounted
          // when resolved
          suspense.isHydrating = false;
          suspense.activeBranch = pendingBranch;
        } else {
          unmount(pendingBranch, parentComponent, suspense);
        } // increment pending ID. this is used to invalidate async callbacks
        // reset suspense state


        suspense.deps = 0; // discard effects from pending branch

        suspense.effects.length = 0; // discard previous container

        suspense.hiddenContainer = createElement('div', container); // fixed by xxxxxx

        if (isInFallback) {
          // already in fallback state
          patch(null, newBranch, suspense.hiddenContainer, null, parentComponent, suspense, isSVG, slotScopeIds, optimized);

          if (suspense.deps <= 0) {
            suspense.resolve();
          } else {
            patch(activeBranch, newFallback, container, anchor, parentComponent, null, // fallback tree will not have suspense context
            isSVG, slotScopeIds, optimized);
            setActiveBranch(suspense, newFallback);
          }
        } else if (activeBranch && isSameVNodeType(newBranch, activeBranch)) {
          // toggled "back" to current active branch
          patch(activeBranch, newBranch, container, anchor, parentComponent, suspense, isSVG, slotScopeIds, optimized); // force resolve

          suspense.resolve(true);
        } else {
          // switched to a 3rd branch
          patch(null, newBranch, suspense.hiddenContainer, null, parentComponent, suspense, isSVG, slotScopeIds, optimized);

          if (suspense.deps <= 0) {
            suspense.resolve();
          }
        }
      }
    } else {
      if (activeBranch && isSameVNodeType(newBranch, activeBranch)) {
        // root did not change, just normal patch
        patch(activeBranch, newBranch, container, anchor, parentComponent, suspense, isSVG, slotScopeIds, optimized);
        setActiveBranch(suspense, newBranch);
      } else {
        // root node toggled
        // invoke @pending event
        triggerEvent(n2, 'onPending'); // mount pending branch in off-dom container

        suspense.pendingBranch = newBranch;
        suspense.pendingId++;
        patch(null, newBranch, suspense.hiddenContainer, null, parentComponent, suspense, isSVG, slotScopeIds, optimized);

        if (suspense.deps <= 0) {
          // incoming branch has no async deps, resolve now.
          suspense.resolve();
        } else {
          var {
            timeout,
            pendingId
          } = suspense;

          if (timeout > 0) {
            setTimeout(() => {
              if (suspense.pendingId === pendingId) {
                suspense.fallback(newFallback);
              }
            }, timeout);
          } else if (timeout === 0) {
            suspense.fallback(newFallback);
          }
        }
      }
    }
  }

  var hasWarned = false;

  function createSuspenseBoundary(vnode, parent, parentComponent, container, hiddenContainer, anchor, isSVG, slotScopeIds, optimized, rendererInternals, isHydrating = false) {
    /* istanbul ignore if */
    if (!hasWarned) {
      hasWarned = true; // @ts-ignore `console.info` cannot be null error

      console[console.info ? 'info' : 'log']("<Suspense> is an experimental feature and its API will likely change.");
    }

    var {
      p: patch,
      m: move,
      um: unmount,
      n: next,
      o: {
        parentNode,
        remove
      }
    } = rendererInternals;
    var timeout = toNumber(vnode.props && vnode.props.timeout);
    var suspense = {
      vnode,
      parent,
      parentComponent,
      isSVG,
      container,
      hiddenContainer,
      anchor,
      deps: 0,
      pendingId: 0,
      timeout: typeof timeout === 'number' ? timeout : -1,
      activeBranch: null,
      pendingBranch: null,
      isInFallback: true,
      isHydrating,
      isUnmounted: false,
      effects: [],

      resolve(resume = false) {
        {
          if (!resume && !suspense.pendingBranch) {
            throw new Error("suspense.resolve() is called without a pending branch.");
          }

          if (suspense.isUnmounted) {
            throw new Error("suspense.resolve() is called on an already unmounted suspense boundary.");
          }
        }
        var {
          vnode,
          activeBranch,
          pendingBranch,
          pendingId,
          effects,
          parentComponent,
          container
        } = suspense;

        if (suspense.isHydrating) {
          suspense.isHydrating = false;
        } else if (!resume) {
          var delayEnter = activeBranch && pendingBranch.transition && pendingBranch.transition.mode === 'out-in';

          if (delayEnter) {
            activeBranch.transition.afterLeave = () => {
              if (pendingId === suspense.pendingId) {
                move(pendingBranch, container, _anchor, 0
                /* ENTER */
                );
              }
            };
          } // this is initial anchor on mount


          var {
            anchor: _anchor
          } = suspense; // unmount current active tree

          if (activeBranch) {
            // if the fallback tree was mounted, it may have been moved
            // as part of a parent suspense. get the latest anchor for insertion
            _anchor = next(activeBranch);
            unmount(activeBranch, parentComponent, suspense, true);
          }

          if (!delayEnter) {
            // move content from off-dom container to actual container
            move(pendingBranch, container, _anchor, 0
            /* ENTER */
            );
          }
        }

        setActiveBranch(suspense, pendingBranch);
        suspense.pendingBranch = null;
        suspense.isInFallback = false; // flush buffered effects
        // check if there is a pending parent suspense

        var parent = suspense.parent;
        var hasUnresolvedAncestor = false;

        while (parent) {
          if (parent.pendingBranch) {
            // found a pending parent suspense, merge buffered post jobs
            // into that parent
            parent.effects.push(...effects);
            hasUnresolvedAncestor = true;
            break;
          }

          parent = parent.parent;
        } // no pending parent suspense, flush all jobs


        if (!hasUnresolvedAncestor) {
          queuePostFlushCb(effects);
        }

        suspense.effects = []; // invoke @resolve event

        triggerEvent(vnode, 'onResolve');
      },

      fallback(fallbackVNode) {
        if (!suspense.pendingBranch) {
          return;
        }

        var {
          vnode,
          activeBranch,
          parentComponent,
          container,
          isSVG
        } = suspense; // invoke @fallback event

        triggerEvent(vnode, 'onFallback');
        var anchor = next(activeBranch);

        var mountFallback = () => {
          if (!suspense.isInFallback) {
            return;
          } // mount the fallback tree


          patch(null, fallbackVNode, container, anchor, parentComponent, null, // fallback tree will not have suspense context
          isSVG, slotScopeIds, optimized);
          setActiveBranch(suspense, fallbackVNode);
        };

        var delayEnter = fallbackVNode.transition && fallbackVNode.transition.mode === 'out-in';

        if (delayEnter) {
          activeBranch.transition.afterLeave = mountFallback;
        }

        suspense.isInFallback = true; // unmount current active branch

        unmount(activeBranch, parentComponent, null, // no suspense so unmount hooks fire now
        true // shouldRemove
        );

        if (!delayEnter) {
          mountFallback();
        }
      },

      move(container, anchor, type) {
        suspense.activeBranch && move(suspense.activeBranch, container, anchor, type);
        suspense.container = container;
      },

      next() {
        return suspense.activeBranch && next(suspense.activeBranch);
      },

      registerDep(instance, setupRenderEffect) {
        var isInPendingSuspense = !!suspense.pendingBranch;

        if (isInPendingSuspense) {
          suspense.deps++;
        }

        var hydratedEl = instance.vnode.el;
        instance.asyncDep.catch(err => {
          handleError(err, instance, 0
          /* SETUP_FUNCTION */
          );
        }).then(asyncSetupResult => {
          // retry when the setup() promise resolves.
          // component may have been unmounted before resolve.
          if (instance.isUnmounted || suspense.isUnmounted || suspense.pendingId !== instance.suspenseId) {
            return;
          } // retry from this component


          instance.asyncResolved = true;
          var {
            vnode
          } = instance;
          {
            pushWarningContext(vnode);
          }
          handleSetupResult(instance, asyncSetupResult, false);

          if (hydratedEl) {
            // vnode may have been replaced if an update happened before the
            // async dep is resolved.
            vnode.el = hydratedEl;
          }

          var placeholder = !hydratedEl && instance.subTree.el;
          setupRenderEffect(instance, vnode, // component may have been moved before resolve.
          // if this is not a hydration, instance.subTree will be the comment
          // placeholder.
          parentNode(hydratedEl || instance.subTree.el), // anchor will not be used if this is hydration, so only need to
          // consider the comment placeholder case.
          hydratedEl ? null : next(instance.subTree), suspense, isSVG, optimized);

          if (placeholder) {
            remove(placeholder);
          }

          updateHOCHostEl(instance, vnode.el);
          {
            popWarningContext();
          } // only decrease deps count if suspense is not already resolved

          if (isInPendingSuspense && --suspense.deps === 0) {
            suspense.resolve();
          }
        });
      },

      unmount(parentSuspense, doRemove) {
        suspense.isUnmounted = true;

        if (suspense.activeBranch) {
          unmount(suspense.activeBranch, parentComponent, parentSuspense, doRemove);
        }

        if (suspense.pendingBranch) {
          unmount(suspense.pendingBranch, parentComponent, parentSuspense, doRemove);
        }
      }

    };
    return suspense;
  }

  function hydrateSuspense(node, vnode, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, rendererInternals, hydrateNode) {
    /* eslint-disable no-restricted-globals */
    var suspense = vnode.suspense = createSuspenseBoundary(vnode, parentSuspense, parentComponent, node.parentNode, document.createElement('div'), null, isSVG, slotScopeIds, optimized, rendererInternals, true
    /* hydrating */
    ); // there are two possible scenarios for server-rendered suspense:
    // - success: ssr content should be fully resolved
    // - failure: ssr content should be the fallback branch.
    // however, on the client we don't really know if it has failed or not
    // attempt to hydrate the DOM assuming it has succeeded, but we still
    // need to construct a suspense boundary first

    var result = hydrateNode(node, suspense.pendingBranch = vnode.ssContent, parentComponent, suspense, slotScopeIds, optimized);

    if (suspense.deps === 0) {
      suspense.resolve();
    }

    return result;
    /* eslint-enable no-restricted-globals */
  }

  function normalizeSuspenseChildren(vnode) {
    var {
      shapeFlag,
      children
    } = vnode;
    var isSlotChildren = shapeFlag & 32
    /* SLOTS_CHILDREN */
    ;
    vnode.ssContent = normalizeSuspenseSlot(isSlotChildren ? children.default : children);
    vnode.ssFallback = isSlotChildren ? normalizeSuspenseSlot(children.fallback) : createVNode(Comment);
  }

  function normalizeSuspenseSlot(s) {
    var block;

    if (isFunction(s)) {
      var trackBlock = isBlockTreeEnabled && s._c;

      if (trackBlock) {
        // disableTracking: false
        // allow block tracking for compiled slots
        // (see ./componentRenderContext.ts)
        s._d = false;
        openBlock();
      }

      s = s();

      if (trackBlock) {
        s._d = true;
        block = currentBlock;
        closeBlock();
      }
    }

    if (isArray(s)) {
      var singleChild = filterSingleRoot(s);

      if (!singleChild) {
        warn$1("<Suspense> slots expect a single root node.");
      }

      s = singleChild;
    }

    s = normalizeVNode(s);

    if (block && !s.dynamicChildren) {
      s.dynamicChildren = block.filter(c => c !== s);
    }

    return s;
  }

  function queueEffectWithSuspense(fn, suspense) {
    if (suspense && suspense.pendingBranch) {
      if (isArray(fn)) {
        suspense.effects.push(...fn);
      } else {
        suspense.effects.push(fn);
      }
    } else {
      queuePostFlushCb(fn);
    }
  }

  function setActiveBranch(suspense, branch) {
    suspense.activeBranch = branch;
    var {
      vnode,
      parentComponent
    } = suspense;
    var el = vnode.el = branch.el; // in case suspense is the root node of a component,
    // recursively update the HOC el

    if (parentComponent && parentComponent.subTree === vnode) {
      parentComponent.vnode.el = el;
      updateHOCHostEl(parentComponent, el);
    }
  }

  function provide(key, value) {
    if (!currentInstance) {
      {
        warn$1("provide() can only be used inside setup().");
      }
    } else {
      var provides = currentInstance.provides; // by default an instance inherits its parent's provides object
      // but when it needs to provide values of its own, it creates its
      // own provides object using parent provides object as prototype.
      // this way in `inject` we can simply look up injections from direct
      // parent and let the prototype chain do the work.

      var parentProvides = currentInstance.parent && currentInstance.parent.provides;

      if (parentProvides === provides) {
        provides = currentInstance.provides = Object.create(parentProvides);
      } // TS doesn't allow symbol as index type


      provides[key] = value;
    }
  }

  function inject(key, defaultValue, treatDefaultAsFactory = false) {
    // fallback to `currentRenderingInstance` so that this can be called in
    // a functional component
    var instance = currentInstance || currentRenderingInstance;

    if (instance) {
      // #2400
      // to support `app.use` plugins,
      // fallback to appContext's `provides` if the intance is at root
      var provides = instance.parent == null ? instance.vnode.appContext && instance.vnode.appContext.provides : instance.parent.provides;

      if (provides && key in provides) {
        // TS doesn't allow symbol as index type
        return provides[key];
      } else if (arguments.length > 1) {
        return treatDefaultAsFactory && isFunction(defaultValue) ? defaultValue.call(instance.proxy) : defaultValue;
      } else {
        warn$1("injection \"".concat(String(key), "\" not found."));
      }
    } else {
      warn$1("inject() can only be used inside setup() or functional components.");
    }
  }

  function useTransitionState() {
    var state = {
      isMounted: false,
      isLeaving: false,
      isUnmounting: false,
      leavingVNodes: new Map()
    };
    onMounted(() => {
      state.isMounted = true;
    });
    onBeforeUnmount(() => {
      state.isUnmounting = true;
    });
    return state;
  }

  var TransitionHookValidator = [Function, Array];
  var BaseTransitionImpl = {
    name: "BaseTransition",
    props: {
      mode: String,
      appear: Boolean,
      persisted: Boolean,
      // enter
      onBeforeEnter: TransitionHookValidator,
      onEnter: TransitionHookValidator,
      onAfterEnter: TransitionHookValidator,
      onEnterCancelled: TransitionHookValidator,
      // leave
      onBeforeLeave: TransitionHookValidator,
      onLeave: TransitionHookValidator,
      onAfterLeave: TransitionHookValidator,
      onLeaveCancelled: TransitionHookValidator,
      // appear
      onBeforeAppear: TransitionHookValidator,
      onAppear: TransitionHookValidator,
      onAfterAppear: TransitionHookValidator,
      onAppearCancelled: TransitionHookValidator
    },

    setup(props, {
      slots
    }) {
      var instance = getCurrentInstance();
      var state = useTransitionState();
      var prevTransitionKey;
      return () => {
        var children = slots.default && getTransitionRawChildren(slots.default(), true);

        if (!children || !children.length) {
          return;
        } // warn multiple elements


        if (children.length > 1) {
          warn$1('<transition> can only be used on a single element or component. Use ' + '<transition-group> for lists.');
        } // there's no need to track reactivity for these props so use the raw
        // props for a bit better perf


        var rawProps = toRaw(props);
        var {
          mode
        } = rawProps; // check mode

        if (mode && !['in-out', 'out-in', 'default'].includes(mode)) {
          warn$1("invalid <transition> mode: ".concat(mode));
        } // at this point children has a guaranteed length of 1.


        var child = children[0];

        if (state.isLeaving) {
          return emptyPlaceholder(child);
        } // in the case of <transition><keep-alive/></transition>, we need to
        // compare the type of the kept-alive children.


        var innerChild = getKeepAliveChild(child);

        if (!innerChild) {
          return emptyPlaceholder(child);
        }

        var enterHooks = resolveTransitionHooks(innerChild, rawProps, state, instance);
        setTransitionHooks(innerChild, enterHooks);
        var oldChild = instance.subTree;
        var oldInnerChild = oldChild && getKeepAliveChild(oldChild);
        var transitionKeyChanged = false;
        var {
          getTransitionKey
        } = innerChild.type;

        if (getTransitionKey) {
          var key = getTransitionKey();

          if (prevTransitionKey === undefined) {
            prevTransitionKey = key;
          } else if (key !== prevTransitionKey) {
            prevTransitionKey = key;
            transitionKeyChanged = true;
          }
        } // handle mode


        if (oldInnerChild && oldInnerChild.type !== Comment && (!isSameVNodeType(innerChild, oldInnerChild) || transitionKeyChanged)) {
          var leavingHooks = resolveTransitionHooks(oldInnerChild, rawProps, state, instance); // update old tree's hooks in case of dynamic transition

          setTransitionHooks(oldInnerChild, leavingHooks); // switching between different views

          if (mode === 'out-in') {
            state.isLeaving = true; // return placeholder node and queue update when leave finishes

            leavingHooks.afterLeave = () => {
              state.isLeaving = false;
              instance.update();
            };

            return emptyPlaceholder(child);
          } else if (mode === 'in-out' && innerChild.type !== Comment) {
            leavingHooks.delayLeave = (el, earlyRemove, delayedLeave) => {
              var leavingVNodesCache = getLeavingNodesForType(state, oldInnerChild);
              leavingVNodesCache[String(oldInnerChild.key)] = oldInnerChild; // early removal callback

              el._leaveCb = () => {
                earlyRemove();
                el._leaveCb = undefined;
                delete enterHooks.delayedLeave;
              };

              enterHooks.delayedLeave = delayedLeave;
            };
          }
        }

        return child;
      };
    }

  }; // export the public type for h/tsx inference
  // also to avoid inline import() in generated d.ts files

  var BaseTransition = BaseTransitionImpl;

  function getLeavingNodesForType(state, vnode) {
    var {
      leavingVNodes
    } = state;
    var leavingVNodesCache = leavingVNodes.get(vnode.type);

    if (!leavingVNodesCache) {
      leavingVNodesCache = Object.create(null);
      leavingVNodes.set(vnode.type, leavingVNodesCache);
    }

    return leavingVNodesCache;
  } // The transition hooks are attached to the vnode as vnode.transition
  // and will be called at appropriate timing in the renderer.


  function resolveTransitionHooks(vnode, props, state, instance) {
    var {
      appear,
      mode,
      persisted = false,
      onBeforeEnter,
      onEnter,
      onAfterEnter,
      onEnterCancelled,
      onBeforeLeave,
      onLeave,
      onAfterLeave,
      onLeaveCancelled,
      onBeforeAppear,
      onAppear,
      onAfterAppear,
      onAppearCancelled
    } = props;
    var key = String(vnode.key);
    var leavingVNodesCache = getLeavingNodesForType(state, vnode);

    var callHook = (hook, args) => {
      hook && callWithAsyncErrorHandling(hook, instance, 9
      /* TRANSITION_HOOK */
      , args);
    };

    var hooks = {
      mode,
      persisted,

      beforeEnter(el) {
        var hook = onBeforeEnter;

        if (!state.isMounted) {
          if (appear) {
            hook = onBeforeAppear || onBeforeEnter;
          } else {
            return;
          }
        } // for same element (v-show)


        if (el._leaveCb) {
          el._leaveCb(true
          /* cancelled */
          );
        } // for toggled element with same key (v-if)


        var leavingVNode = leavingVNodesCache[key];

        if (leavingVNode && isSameVNodeType(vnode, leavingVNode) && leavingVNode.el._leaveCb) {
          // force early removal (not cancelled)
          leavingVNode.el._leaveCb();
        }

        callHook(hook, [el]);
      },

      enter(el) {
        var hook = onEnter;
        var afterHook = onAfterEnter;
        var cancelHook = onEnterCancelled;

        if (!state.isMounted) {
          if (appear) {
            hook = onAppear || onEnter;
            afterHook = onAfterAppear || onAfterEnter;
            cancelHook = onAppearCancelled || onEnterCancelled;
          } else {
            return;
          }
        }

        var called = false;

        var done = el._enterCb = cancelled => {
          if (called) return;
          called = true;

          if (cancelled) {
            callHook(cancelHook, [el]);
          } else {
            callHook(afterHook, [el]);
          }

          if (hooks.delayedLeave) {
            hooks.delayedLeave();
          }

          el._enterCb = undefined;
        };

        if (hook) {
          hook(el, done);

          if (hook.length <= 1) {
            done();
          }
        } else {
          done();
        }
      },

      leave(el, remove) {
        var key = String(vnode.key);

        if (el._enterCb) {
          el._enterCb(true
          /* cancelled */
          );
        }

        if (state.isUnmounting) {
          return remove();
        }

        callHook(onBeforeLeave, [el]);
        var called = false;

        var done = el._leaveCb = cancelled => {
          if (called) return;
          called = true;
          remove();

          if (cancelled) {
            callHook(onLeaveCancelled, [el]);
          } else {
            callHook(onAfterLeave, [el]);
          }

          el._leaveCb = undefined;

          if (leavingVNodesCache[key] === vnode) {
            delete leavingVNodesCache[key];
          }
        };

        leavingVNodesCache[key] = vnode;

        if (onLeave) {
          onLeave(el, done);

          if (onLeave.length <= 1) {
            done();
          }
        } else {
          done();
        }
      },

      clone(vnode) {
        return resolveTransitionHooks(vnode, props, state, instance);
      }

    };
    return hooks;
  } // the placeholder really only handles one special case: KeepAlive
  // in the case of a KeepAlive in a leave phase we need to return a KeepAlive
  // placeholder with empty content to avoid the KeepAlive instance from being
  // unmounted.


  function emptyPlaceholder(vnode) {
    if (isKeepAlive(vnode)) {
      vnode = cloneVNode(vnode);
      vnode.children = null;
      return vnode;
    }
  }

  function getKeepAliveChild(vnode) {
    return isKeepAlive(vnode) ? vnode.children ? vnode.children[0] : undefined : vnode;
  }

  function setTransitionHooks(vnode, hooks) {
    if (vnode.shapeFlag & 6
    /* COMPONENT */
    && vnode.component) {
      setTransitionHooks(vnode.component.subTree, hooks);
    } else if (vnode.shapeFlag & 128
    /* SUSPENSE */
    ) {
      vnode.ssContent.transition = hooks.clone(vnode.ssContent);
      vnode.ssFallback.transition = hooks.clone(vnode.ssFallback);
    } else {
      vnode.transition = hooks;
    }
  }

  function getTransitionRawChildren(children, keepComment = false) {
    var ret = [];
    var keyedFragmentCount = 0;

    for (var i = 0; i < children.length; i++) {
      var child = children[i]; // handle fragment children case, e.g. v-for

      if (child.type === Fragment) {
        if (child.patchFlag & 128
        /* KEYED_FRAGMENT */
        ) keyedFragmentCount++;
        ret = ret.concat(getTransitionRawChildren(child.children, keepComment));
      } // comment placeholders should be skipped, e.g. v-if
      else if (keepComment || child.type !== Comment) {
        ret.push(child);
      }
    } // #1126 if a transition children list contains multiple sub fragments, these
    // fragments will be merged into a flat children array. Since each v-for
    // fragment may contain different static bindings inside, we need to de-op
    // these children to force full diffs to ensure correct behavior.


    if (keyedFragmentCount > 1) {
      for (var _i = 0; _i < ret.length; _i++) {
        ret[_i].patchFlag = -2
        /* BAIL */
        ;
      }
    }

    return ret;
  } // implementation, close to no-op


  function defineComponent(options) {
    return isFunction(options) ? {
      setup: options,
      name: options.name
    } : options;
  }

  var isAsyncWrapper = i => !!i.type.__asyncLoader;

  function defineAsyncComponent(source) {
    if (isFunction(source)) {
      source = {
        loader: source
      };
    }

    var {
      loader,
      loadingComponent,
      errorComponent,
      delay = 200,
      timeout,
      // undefined = never times out
      suspensible = true,
      onError: userOnError
    } = source;
    var pendingRequest = null;
    var resolvedComp;
    var retries = 0;

    var retry = () => {
      retries++;
      pendingRequest = null;
      return load();
    };

    var load = () => {
      var thisRequest;
      return pendingRequest || (thisRequest = pendingRequest = loader().catch(err => {
        err = err instanceof Error ? err : new Error(String(err));

        if (userOnError) {
          return new Promise((resolve, reject) => {
            var userRetry = () => resolve(retry());

            var userFail = () => reject(err);

            userOnError(err, userRetry, userFail, retries + 1);
          });
        } else {
          throw err;
        }
      }).then(comp => {
        if (thisRequest !== pendingRequest && pendingRequest) {
          return pendingRequest;
        }

        if (!comp) {
          warn$1("Async component loader resolved to undefined. " + "If you are using retry(), make sure to return its return value.");
        } // interop module default


        if (comp && (comp.__esModule || comp[Symbol.toStringTag] === 'Module')) {
          comp = comp.default;
        }

        if (comp && !isObject(comp) && !isFunction(comp)) {
          throw new Error("Invalid async component load result: ".concat(comp));
        }

        resolvedComp = comp;
        return comp;
      }));
    };

    return defineComponent({
      name: 'AsyncComponentWrapper',
      __asyncLoader: load,

      get __asyncResolved() {
        return resolvedComp;
      },

      setup() {
        var instance = currentInstance; // already resolved

        if (resolvedComp) {
          return () => createInnerComp(resolvedComp, instance);
        }

        var onError = err => {
          pendingRequest = null;
          handleError(err, instance, 13
          /* ASYNC_COMPONENT_LOADER */
          , !errorComponent
          /* do not throw in dev if user provided error component */
          );
        }; // suspense-controlled or SSR.


        if (suspensible && instance.suspense || isInSSRComponentSetup) {
          return load().then(comp => {
            return () => createInnerComp(comp, instance);
          }).catch(err => {
            onError(err);
            return () => errorComponent ? createVNode(errorComponent, {
              error: err
            }) : null;
          });
        }

        var loaded = ref(false);
        var error = ref();
        var delayed = ref(!!delay);

        if (delay) {
          setTimeout(() => {
            delayed.value = false;
          }, delay);
        }

        if (timeout != null) {
          setTimeout(() => {
            if (!loaded.value && !error.value) {
              var err = new Error("Async component timed out after ".concat(timeout, "ms."));
              onError(err);
              error.value = err;
            }
          }, timeout);
        }

        load().then(() => {
          loaded.value = true;

          if (instance.parent && isKeepAlive(instance.parent.vnode)) {
            // parent is keep-alive, force update so the loaded component's
            // name is taken into account
            queueJob(instance.parent.update);
          }
        }).catch(err => {
          onError(err);
          error.value = err;
        });
        return () => {
          if (loaded.value && resolvedComp) {
            return createInnerComp(resolvedComp, instance);
          } else if (error.value && errorComponent) {
            return createVNode(errorComponent, {
              error: error.value
            });
          } else if (loadingComponent && !delayed.value) {
            return createVNode(loadingComponent);
          }
        };
      }

    });
  }

  function createInnerComp(comp, {
    vnode: {
      ref,
      props,
      children
    }
  }) {
    var vnode = createVNode(comp, props, children); // ensure inner component inherits the async wrapper's ref owner

    vnode.ref = ref;
    return vnode;
  }

  var isKeepAlive = vnode => vnode.type.__isKeepAlive;

  var KeepAliveImpl = {
    name: "KeepAlive",
    // Marker for special handling inside the renderer. We are not using a ===
    // check directly on KeepAlive in the renderer, because importing it directly
    // would prevent it from being tree-shaken.
    __isKeepAlive: true,
    props: {
      include: [String, RegExp, Array],
      exclude: [String, RegExp, Array],
      max: [String, Number]
    },

    setup(props, {
      slots
    }) {
      var instance = getCurrentInstance(); // KeepAlive communicates with the instantiated renderer via the
      // ctx where the renderer passes in its internals,
      // and the KeepAlive instance exposes activate/deactivate implementations.
      // The whole point of this is to avoid importing KeepAlive directly in the
      // renderer to facilitate tree-shaking.

      var sharedContext = instance.ctx; // if the internal renderer is not registered, it indicates that this is server-side rendering,
      // for KeepAlive, we just need to render its children

      if (!sharedContext.renderer) {
        return slots.default;
      }

      var cache = new Map();
      var keys = new Set();
      var current = null;
      {
        instance.__v_cache = cache;
      }
      var parentSuspense = instance.suspense;
      var {
        renderer: {
          p: patch,
          m: move,
          um: _unmount,
          o: {
            createElement
          }
        }
      } = sharedContext;
      var storageContainer = createElement('div', null); // fixed by xxxxx

      sharedContext.activate = (vnode, container, anchor, isSVG, optimized) => {
        var instance = vnode.component;
        move(vnode, container, anchor, 0
        /* ENTER */
        , parentSuspense); // in case props have changed

        patch(instance.vnode, vnode, container, anchor, instance, parentSuspense, isSVG, vnode.slotScopeIds, optimized);
        queuePostRenderEffect(() => {
          instance.isDeactivated = false;

          if (instance.a) {
            invokeArrayFns(instance.a);
          }

          var vnodeHook = vnode.props && vnode.props.onVnodeMounted;

          if (vnodeHook) {
            invokeVNodeHook(vnodeHook, instance.parent, vnode);
          }
        }, parentSuspense);
        {
          // Update components tree
          devtoolsComponentAdded(instance);
        }
      };

      sharedContext.deactivate = vnode => {
        var instance = vnode.component;
        move(vnode, storageContainer, null, 1
        /* LEAVE */
        , parentSuspense);
        queuePostRenderEffect(() => {
          if (instance.da) {
            invokeArrayFns(instance.da);
          }

          var vnodeHook = vnode.props && vnode.props.onVnodeUnmounted;

          if (vnodeHook) {
            invokeVNodeHook(vnodeHook, instance.parent, vnode);
          }

          instance.isDeactivated = true;
        }, parentSuspense);
        {
          // Update components tree
          devtoolsComponentAdded(instance);
        }
      };

      function unmount(vnode) {
        // reset the shapeFlag so it can be properly unmounted
        resetShapeFlag(vnode);

        _unmount(vnode, instance, parentSuspense);
      }

      function pruneCache(filter) {
        cache.forEach((vnode, key) => {
          var name = getComponentName(vnode.type);

          if (name && (!filter || !filter(name))) {
            pruneCacheEntry(key);
          }
        });
      }

      function pruneCacheEntry(key) {
        var cached = cache.get(key);

        if (!current || cached.type !== current.type) {
          unmount(cached);
        } else if (current) {
          // current active instance should no longer be kept-alive.
          // we can't unmount it now but it might be later, so reset its flag now.
          resetShapeFlag(current);
        }

        cache.delete(key);
        keys.delete(key);
      } // prune cache on include/exclude prop change


      watch(() => [props.include, props.exclude], ([include, exclude]) => {
        include && pruneCache(name => matches(include, name));
        exclude && pruneCache(name => !matches(exclude, name));
      }, // prune post-render after `current` has been updated
      {
        flush: 'post',
        deep: true
      }); // cache sub tree after render

      var pendingCacheKey = null;

      var cacheSubtree = () => {
        // fix #1621, the pendingCacheKey could be 0
        if (pendingCacheKey != null) {
          cache.set(pendingCacheKey, getInnerChild(instance.subTree));
        }
      };

      onMounted(cacheSubtree);
      onUpdated(cacheSubtree);
      onBeforeUnmount(() => {
        cache.forEach(cached => {
          var {
            subTree,
            suspense
          } = instance;
          var vnode = getInnerChild(subTree);

          if (cached.type === vnode.type) {
            // current instance will be unmounted as part of keep-alive's unmount
            resetShapeFlag(vnode); // but invoke its deactivated hook here

            var da = vnode.component.da;
            da && queuePostRenderEffect(da, suspense);
            return;
          }

          unmount(cached);
        });
      });
      return () => {
        pendingCacheKey = null;

        if (!slots.default) {
          return null;
        }

        var children = slots.default();
        var rawVNode = children[0];

        if (children.length > 1) {
          {
            warn$1("KeepAlive should contain exactly one component child.");
          }
          current = null;
          return children;
        } else if (!isVNode(rawVNode) || !(rawVNode.shapeFlag & 4
        /* STATEFUL_COMPONENT */
        ) && !(rawVNode.shapeFlag & 128
        /* SUSPENSE */
        )) {
          current = null;
          return rawVNode;
        }

        var vnode = getInnerChild(rawVNode);
        var comp = vnode.type; // for async components, name check should be based in its loaded
        // inner component if available

        var name = getComponentName(isAsyncWrapper(vnode) ? vnode.type.__asyncResolved || {} : comp);
        var {
          include,
          exclude,
          max
        } = props;

        if (include && (!name || !matches(include, name)) || exclude && name && matches(exclude, name)) {
          current = vnode;
          return rawVNode;
        }

        var key = vnode.key == null ? comp : vnode.key;
        var cachedVNode = cache.get(key); // clone vnode if it's reused because we are going to mutate it

        if (vnode.el) {
          vnode = cloneVNode(vnode);

          if (rawVNode.shapeFlag & 128
          /* SUSPENSE */
          ) {
            rawVNode.ssContent = vnode;
          }
        } // #1513 it's possible for the returned vnode to be cloned due to attr
        // fallthrough or scopeId, so the vnode here may not be the final vnode
        // that is mounted. Instead of caching it directly, we store the pending
        // key and cache `instance.subTree` (the normalized vnode) in
        // beforeMount/beforeUpdate hooks.


        pendingCacheKey = key;

        if (cachedVNode) {
          // copy over mounted state
          vnode.el = cachedVNode.el;
          vnode.component = cachedVNode.component;

          if (vnode.transition) {
            // recursively update transition hooks on subTree
            setTransitionHooks(vnode, vnode.transition);
          } // avoid vnode being mounted as fresh


          vnode.shapeFlag |= 512
          /* COMPONENT_KEPT_ALIVE */
          ; // make this key the freshest

          keys.delete(key);
          keys.add(key);
        } else {
          keys.add(key); // prune oldest entry

          if (max && keys.size > parseInt(max, 10)) {
            pruneCacheEntry(keys.values().next().value);
          }
        } // avoid vnode being unmounted


        vnode.shapeFlag |= 256
        /* COMPONENT_SHOULD_KEEP_ALIVE */
        ;
        current = vnode;
        return rawVNode;
      };
    }

  }; // export the public type for h/tsx inference
  // also to avoid inline import() in generated d.ts files

  var KeepAlive = KeepAliveImpl;

  function matches(pattern, name) {
    if (isArray(pattern)) {
      return pattern.some(p => matches(p, name));
    } else if (isString(pattern)) {
      return pattern.split(',').indexOf(name) > -1;
    } else if (pattern.test) {
      return pattern.test(name);
    }
    /* istanbul ignore next */


    return false;
  }

  function onActivated(hook, target) {
    registerKeepAliveHook(hook, "a"
    /* ACTIVATED */
    , target);
  }

  function onDeactivated(hook, target) {
    registerKeepAliveHook(hook, "da"
    /* DEACTIVATED */
    , target);
  }

  function registerKeepAliveHook(hook, type, target = currentInstance) {
    // cache the deactivate branch check wrapper for injected hooks so the same
    // hook can be properly deduped by the scheduler. "__wdc" stands for "with
    // deactivation check".
    var wrappedHook = hook.__wdc || (hook.__wdc = () => {
      // only fire the hook if the target instance is NOT in a deactivated branch.
      var current = target;

      while (current) {
        if (current.isDeactivated) {
          return;
        }

        current = current.parent;
      }

      hook();
    });

    injectHook(type, wrappedHook, target); // In addition to registering it on the target instance, we walk up the parent
    // chain and register it on all ancestor instances that are keep-alive roots.
    // This avoids the need to walk the entire component tree when invoking these
    // hooks, and more importantly, avoids the need to track child components in
    // arrays.

    if (target) {
      var current = target.parent;

      while (current && current.parent) {
        if (isKeepAlive(current.parent.vnode)) {
          injectToKeepAliveRoot(wrappedHook, type, target, current);
        }

        current = current.parent;
      }
    }
  }

  function injectToKeepAliveRoot(hook, type, target, keepAliveRoot) {
    // injectHook wraps the original for error handling, so make sure to remove
    // the wrapped version.
    var injected = injectHook(type, hook, keepAliveRoot, true
    /* prepend */
    );
    onUnmounted(() => {
      remove(keepAliveRoot[type], injected);
    }, target);
  }

  function resetShapeFlag(vnode) {
    var shapeFlag = vnode.shapeFlag;

    if (shapeFlag & 256
    /* COMPONENT_SHOULD_KEEP_ALIVE */
    ) {
      shapeFlag -= 256
      /* COMPONENT_SHOULD_KEEP_ALIVE */
      ;
    }

    if (shapeFlag & 512
    /* COMPONENT_KEPT_ALIVE */
    ) {
      shapeFlag -= 512
      /* COMPONENT_KEPT_ALIVE */
      ;
    }

    vnode.shapeFlag = shapeFlag;
  }

  function getInnerChild(vnode) {
    return vnode.shapeFlag & 128
    /* SUSPENSE */
    ? vnode.ssContent : vnode;
  }

  function injectHook(type, hook, target = currentInstance, prepend = false) {
    if (target) {
      // fixed by xxxxxx
      if (isRootHook(type)) {
        target = target.root;
      }

      var {
        __page_container__
      } = target.root.vnode; // 仅限 App 端

      if (__page_container__) {
        __page_container__.onInjectHook(type);
      }

      var hooks = target[type] || (target[type] = []); // cache the error handling wrapper for injected hooks so the same hook
      // can be properly deduped by the scheduler. "__weh" stands for "with error
      // handling".

      var wrappedHook = hook.__weh || (hook.__weh = (...args) => {
        if (target.isUnmounted) {
          return;
        } // disable tracking inside all lifecycle hooks
        // since they can potentially be called inside effects.


        pauseTracking(); // Set currentInstance during hook invocation.
        // This assumes the hook does not synchronously trigger other hooks, which
        // can only be false when the user does something really funky.

        setCurrentInstance(target); // fixed by xxxxxx

        var res = callWithAsyncErrorHandling(hook, target, type, args);
        unsetCurrentInstance();
        resetTracking();
        return res;
      });

      if (prepend) {
        hooks.unshift(wrappedHook);
      } else {
        hooks.push(wrappedHook);
      }

      return wrappedHook;
    } else {
      var apiName = toHandlerKey((ErrorTypeStrings[type] || type.replace(/^on/, '')).replace(/ hook$/, '')); // fixed by xxxxxx

      warn$1("".concat(apiName, " is called when there is no active component instance to be ") + "associated with. " + "Lifecycle injection APIs can only be used during execution of setup()." + (" If you are using async setup(), make sure to register lifecycle " + "hooks before the first await statement."));
    }
  }

  var createHook = lifecycle => (hook, target = currentInstance) => // post-create lifecycle registrations are noops during SSR (except for serverPrefetch)
  (!isInSSRComponentSetup || lifecycle === "sp"
  /* SERVER_PREFETCH */
  ) && injectHook(lifecycle, hook, target);

  var onBeforeMount = createHook("bm"
  /* BEFORE_MOUNT */
  );
  var onMounted = createHook("m"
  /* MOUNTED */
  );
  var onBeforeUpdate = createHook("bu"
  /* BEFORE_UPDATE */
  );
  var onUpdated = createHook("u"
  /* UPDATED */
  );
  var onBeforeUnmount = createHook("bum"
  /* BEFORE_UNMOUNT */
  );
  var onUnmounted = createHook("um"
  /* UNMOUNTED */
  );
  var onServerPrefetch = createHook("sp"
  /* SERVER_PREFETCH */
  );
  var onRenderTriggered = createHook("rtg"
  /* RENDER_TRIGGERED */
  );
  var onRenderTracked = createHook("rtc"
  /* RENDER_TRACKED */
  );

  function onErrorCaptured(hook, target = currentInstance) {
    injectHook("ec"
    /* ERROR_CAPTURED */
    , hook, target);
  }

  function createDuplicateChecker() {
    var cache = Object.create(null);
    return (type, key) => {
      if (cache[key]) {
        warn$1("".concat(type, " property \"").concat(key, "\" is already defined in ").concat(cache[key], "."));
      } else {
        cache[key] = type;
      }
    };
  }

  var shouldCacheAccess = true;

  function applyOptions(instance) {
    var options = resolveMergedOptions(instance);
    var publicThis = instance.proxy;
    var ctx = instance.ctx; // do not cache property access on public proxy during state initialization

    shouldCacheAccess = false; // call beforeCreate first before accessing other options since
    // the hook may mutate resolved options (#2791)

    if (options.beforeCreate) {
      callHook(options.beforeCreate, instance, "bc"
      /* BEFORE_CREATE */
      );
    }

    var {
      // state
      data: dataOptions,
      computed: computedOptions,
      methods,
      watch: watchOptions,
      provide: provideOptions,
      inject: injectOptions,
      // lifecycle
      created,
      beforeMount,
      mounted,
      beforeUpdate,
      updated,
      activated,
      deactivated,
      beforeDestroy,
      beforeUnmount,
      destroyed,
      unmounted,
      render,
      renderTracked,
      renderTriggered,
      errorCaptured,
      serverPrefetch,
      // public API
      expose,
      inheritAttrs,
      // assets
      components,
      directives,
      filters
    } = options;
    var checkDuplicateProperties = createDuplicateChecker();
    {
      var [propsOptions] = instance.propsOptions;

      if (propsOptions) {
        for (var key in propsOptions) {
          checkDuplicateProperties("Props"
          /* PROPS */
          , key);
        }
      }
    } // options initialization order (to be consistent with Vue 2):
    // - props (already done outside of this function)
    // - inject
    // - methods
    // - data (deferred since it relies on `this` access)
    // - computed
    // - watch (deferred since it relies on `this` access)

    if (injectOptions) {
      resolveInjections(injectOptions, ctx, checkDuplicateProperties, instance.appContext.config.unwrapInjectedRef);
    }

    if (methods) {
      for (var _key2 in methods) {
        var methodHandler = methods[_key2];

        if (isFunction(methodHandler)) {
          // In dev mode, we use the `createRenderContext` function to define
          // methods to the proxy target, and those are read-only but
          // reconfigurable, so it needs to be redefined here
          {
            Object.defineProperty(ctx, _key2, {
              value: methodHandler.bind(publicThis),
              configurable: true,
              enumerable: true,
              writable: true
            });
          }
          {
            checkDuplicateProperties("Methods"
            /* METHODS */
            , _key2);
          }
        } else {
          warn$1("Method \"".concat(_key2, "\" has type \"").concat(typeof methodHandler, "\" in the component definition. ") + "Did you reference the function correctly?");
        }
      }
    }

    if (dataOptions) {
      (function () {
        if (!isFunction(dataOptions)) {
          warn$1("The data option must be a function. " + "Plain object usage is no longer supported.");
        }

        var data = dataOptions.call(publicThis, publicThis);

        if (isPromise(data)) {
          warn$1("data() returned a Promise - note data() cannot be async; If you " + "intend to perform data fetching before component renders, use " + "async setup() + <Suspense>.");
        }

        if (!isObject(data)) {
          warn$1("data() should return an object.");
        } else {
          instance.data = reactive(data);
          {
            var _loop = function (_key3) {
              checkDuplicateProperties("Data"
              /* DATA */
              , _key3); // expose data on ctx during dev

              if (_key3[0] !== '$' && _key3[0] !== '_') {
                Object.defineProperty(ctx, _key3, {
                  configurable: true,
                  enumerable: true,
                  get: () => data[_key3],
                  set: NOOP
                });
              }
            };

            for (var _key3 in data) {
              _loop(_key3);
            }
          }
        }
      })();
    } // state initialization complete at this point - start caching access


    shouldCacheAccess = true;

    if (computedOptions) {
      var _loop2 = function (_key4) {
        var opt = computedOptions[_key4];
        var get = isFunction(opt) ? opt.bind(publicThis, publicThis) : isFunction(opt.get) ? opt.get.bind(publicThis, publicThis) : NOOP;

        if (get === NOOP) {
          warn$1("Computed property \"".concat(_key4, "\" has no getter."));
        }

        var set = !isFunction(opt) && isFunction(opt.set) ? opt.set.bind(publicThis) : () => {
          warn$1("Write operation failed: computed property \"".concat(_key4, "\" is readonly."));
        };
        var c = computed({
          get,
          set
        });
        Object.defineProperty(ctx, _key4, {
          enumerable: true,
          configurable: true,
          get: () => c.value,
          set: v => c.value = v
        });
        {
          checkDuplicateProperties("Computed"
          /* COMPUTED */
          , _key4);
        }
      };

      for (var _key4 in computedOptions) {
        _loop2(_key4);
      }
    }

    if (watchOptions) {
      for (var _key5 in watchOptions) {
        createWatcher(watchOptions[_key5], ctx, publicThis, _key5);
      }
    }

    if (provideOptions) {
      var provides = isFunction(provideOptions) ? provideOptions.call(publicThis) : provideOptions;
      Reflect.ownKeys(provides).forEach(key => {
        provide(key, provides[key]);
      });
    }

    if (created) {
      callHook(created, instance, "c"
      /* CREATED */
      );
    }

    function registerLifecycleHook(register, hook) {
      if (isArray(hook)) {
        hook.forEach(_hook => register(_hook.bind(publicThis)));
      } else if (hook) {
        register(hook.bind(publicThis));
      }
    }

    registerLifecycleHook(onBeforeMount, beforeMount);
    registerLifecycleHook(onMounted, mounted);
    registerLifecycleHook(onBeforeUpdate, beforeUpdate);
    registerLifecycleHook(onUpdated, updated);
    registerLifecycleHook(onActivated, activated);
    registerLifecycleHook(onDeactivated, deactivated);
    registerLifecycleHook(onErrorCaptured, errorCaptured);
    registerLifecycleHook(onRenderTracked, renderTracked);
    registerLifecycleHook(onRenderTriggered, renderTriggered);
    registerLifecycleHook(onBeforeUnmount, beforeUnmount);
    registerLifecycleHook(onUnmounted, unmounted);
    registerLifecycleHook(onServerPrefetch, serverPrefetch);

    if (isArray(expose)) {
      if (expose.length) {
        var exposed = instance.exposed || (instance.exposed = {});
        expose.forEach(key => {
          Object.defineProperty(exposed, key, {
            get: () => publicThis[key],
            set: val => publicThis[key] = val
          });
        });
      } else if (!instance.exposed) {
        instance.exposed = {};
      }
    } // options that are handled when creating the instance but also need to be
    // applied from mixins


    if (render && instance.render === NOOP) {
      instance.render = render;
    }

    if (inheritAttrs != null) {
      instance.inheritAttrs = inheritAttrs;
    } // asset options.


    if (components) instance.components = components;
    if (directives) instance.directives = directives; // fixed by xxxxxx

    var customApplyOptions = instance.appContext.config.globalProperties.$applyOptions;

    if (customApplyOptions) {
      customApplyOptions(options, instance, publicThis);
    }
  }

  function resolveInjections(injectOptions, ctx, checkDuplicateProperties = NOOP, unwrapRef = false) {
    if (isArray(injectOptions)) {
      injectOptions = normalizeInject(injectOptions);
    }

    var _loop3 = function (key) {
      var opt = injectOptions[key];
      var injected = void 0;

      if (isObject(opt)) {
        if ('default' in opt) {
          injected = inject(opt.from || key, opt.default, true
          /* treat default function as factory */
          );
        } else {
          injected = inject(opt.from || key);
        }
      } else {
        injected = inject(opt);
      }

      if (isRef(injected)) {
        // TODO remove the check in 3.3
        if (unwrapRef) {
          Object.defineProperty(ctx, key, {
            enumerable: true,
            configurable: true,
            get: () => injected.value,
            set: v => injected.value = v
          });
        } else {
          {
            warn$1("injected property \"".concat(key, "\" is a ref and will be auto-unwrapped ") + "and no longer needs `.value` in the next minor release. " + "To opt-in to the new behavior now, " + "set `app.config.unwrapInjectedRef = true` (this config is " + "temporary and will not be needed in the future.)");
          }
          ctx[key] = injected;
        }
      } else {
        ctx[key] = injected;
      }

      {
        checkDuplicateProperties("Inject"
        /* INJECT */
        , key);
      }
    };

    for (var key in injectOptions) {
      _loop3(key);
    }
  }

  function callHook(hook, instance, type) {
    callWithAsyncErrorHandling(isArray(hook) ? hook.map(h => h.bind(instance.proxy)) : hook.bind(instance.proxy), instance, type);
  }

  function createWatcher(raw, ctx, publicThis, key) {
    var getter = key.includes('.') ? createPathGetter(publicThis, key) : () => publicThis[key];

    if (isString(raw)) {
      var handler = ctx[raw];

      if (isFunction(handler)) {
        watch(getter, handler);
      } else {
        warn$1("Invalid watch handler specified by key \"".concat(raw, "\""), handler);
      }
    } else if (isFunction(raw)) {
      watch(getter, raw.bind(publicThis));
    } else if (isObject(raw)) {
      if (isArray(raw)) {
        raw.forEach(r => createWatcher(r, ctx, publicThis, key));
      } else {
        var _handler = isFunction(raw.handler) ? raw.handler.bind(publicThis) : ctx[raw.handler];

        if (isFunction(_handler)) {
          watch(getter, _handler, raw);
        } else {
          warn$1("Invalid watch handler specified by key \"".concat(raw.handler, "\""), _handler);
        }
      }
    } else {
      warn$1("Invalid watch option: \"".concat(key, "\""), raw);
    }
  }
  /**
   * Resolve merged options and cache it on the component.
   * This is done only once per-component since the merging does not involve
   * instances.
   */


  function resolveMergedOptions(instance) {
    var base = instance.type;
    var {
      mixins,
      extends: extendsOptions
    } = base;
    var {
      mixins: globalMixins,
      optionsCache: cache,
      config: {
        optionMergeStrategies
      }
    } = instance.appContext;
    var cached = cache.get(base);
    var resolved;

    if (cached) {
      resolved = cached;
    } else if (!globalMixins.length && !mixins && !extendsOptions) {
      {
        resolved = base;
      }
    } else {
      resolved = {};

      if (globalMixins.length) {
        globalMixins.forEach(m => mergeOptions(resolved, m, optionMergeStrategies, true));
      }

      mergeOptions(resolved, base, optionMergeStrategies);
    }

    cache.set(base, resolved);
    return resolved;
  }

  function mergeOptions(to, from, strats, asMixin = false) {
    var {
      mixins,
      extends: extendsOptions
    } = from;

    if (extendsOptions) {
      mergeOptions(to, extendsOptions, strats, true);
    }

    if (mixins) {
      mixins.forEach(m => mergeOptions(to, m, strats, true));
    }

    for (var key in from) {
      if (asMixin && key === 'expose') {
        warn$1("\"expose\" option is ignored when declared in mixins or extends. " + "It should only be declared in the base component itself.");
      } else {
        var strat = internalOptionMergeStrats[key] || strats && strats[key];
        to[key] = strat ? strat(to[key], from[key]) : from[key];
      }
    }

    return to;
  }

  var internalOptionMergeStrats = {
    data: mergeDataFn,
    props: mergeObjectOptions,
    emits: mergeObjectOptions,
    // objects
    methods: mergeObjectOptions,
    computed: mergeObjectOptions,
    // lifecycle
    beforeCreate: mergeAsArray,
    created: mergeAsArray,
    beforeMount: mergeAsArray,
    mounted: mergeAsArray,
    beforeUpdate: mergeAsArray,
    updated: mergeAsArray,
    beforeDestroy: mergeAsArray,
    beforeUnmount: mergeAsArray,
    destroyed: mergeAsArray,
    unmounted: mergeAsArray,
    activated: mergeAsArray,
    deactivated: mergeAsArray,
    errorCaptured: mergeAsArray,
    serverPrefetch: mergeAsArray,
    // assets
    components: mergeObjectOptions,
    directives: mergeObjectOptions,
    // watch
    watch: mergeWatchOptions,
    // provide / inject
    provide: mergeDataFn,
    inject: mergeInject
  };

  function mergeDataFn(to, from) {
    if (!from) {
      return to;
    }

    if (!to) {
      return from;
    }

    return function mergedDataFn() {
      return extend(isFunction(to) ? to.call(this, this) : to, isFunction(from) ? from.call(this, this) : from);
    };
  }

  function mergeInject(to, from) {
    return mergeObjectOptions(normalizeInject(to), normalizeInject(from));
  }

  function normalizeInject(raw) {
    if (isArray(raw)) {
      var res = {};

      for (var i = 0; i < raw.length; i++) {
        res[raw[i]] = raw[i];
      }

      return res;
    }

    return raw;
  }

  function mergeAsArray(to, from) {
    return to ? [...new Set([].concat(to, from))] : from;
  }

  function mergeObjectOptions(to, from) {
    return to ? extend(extend(Object.create(null), to), from) : from;
  }

  function mergeWatchOptions(to, from) {
    if (!to) return from;
    if (!from) return to;
    var merged = extend(Object.create(null), to);

    for (var key in from) {
      merged[key] = mergeAsArray(to[key], from[key]);
    }

    return merged;
  }

  function initProps(instance, rawProps, isStateful, // result of bitwise flag comparison
  isSSR = false) {
    var props = {};
    var attrs = {};
    def(attrs, InternalObjectKey, 1);
    instance.propsDefaults = Object.create(null);
    setFullProps(instance, rawProps, props, attrs); // ensure all declared prop keys are present

    for (var key in instance.propsOptions[0]) {
      if (!(key in props)) {
        props[key] = undefined;
      }
    } // validation


    {
      validateProps(rawProps || {}, props, instance);
    }

    if (isStateful) {
      // stateful
      instance.props = isSSR ? props : shallowReactive(props);
    } else {
      if (!instance.type.props) {
        // functional w/ optional props, props === attrs
        instance.props = attrs;
      } else {
        // functional w/ declared props
        instance.props = props;
      }
    }

    instance.attrs = attrs;
  }

  function updateProps(instance, rawProps, rawPrevProps, optimized) {
    var {
      props,
      attrs,
      vnode: {
        patchFlag
      }
    } = instance;
    var rawCurrentProps = toRaw(props);
    var [options] = instance.propsOptions;
    var hasAttrsChanged = false;

    if ( // always force full diff in dev
    // - #1942 if hmr is enabled with sfc component
    // - vite#872 non-sfc component used by sfc component
    !(instance.type.__hmrId || instance.parent && instance.parent.type.__hmrId) && (optimized || patchFlag > 0) && !(patchFlag & 16
    /* FULL_PROPS */
    )) {
      if (patchFlag & 8
      /* PROPS */
      ) {
        // Compiler-generated props & no keys change, just set the updated
        // the props.
        var propsToUpdate = instance.vnode.dynamicProps;

        for (var i = 0; i < propsToUpdate.length; i++) {
          var key = propsToUpdate[i]; // PROPS flag guarantees rawProps to be non-null

          var value = rawProps[key];

          if (options) {
            // attr / props separation was done on init and will be consistent
            // in this code path, so just check if attrs have it.
            if (hasOwn(attrs, key)) {
              if (value !== attrs[key]) {
                attrs[key] = value;
                hasAttrsChanged = true;
              }
            } else {
              var camelizedKey = camelize(key);
              props[camelizedKey] = resolvePropValue(options, rawCurrentProps, camelizedKey, value, instance, false
              /* isAbsent */
              );
            }
          } else {
            if (value !== attrs[key]) {
              attrs[key] = value;
              hasAttrsChanged = true;
            }
          }
        }
      }
    } else {
      // full props update.
      if (setFullProps(instance, rawProps, props, attrs)) {
        hasAttrsChanged = true;
      } // in case of dynamic props, check if we need to delete keys from
      // the props object


      var kebabKey;

      for (var _key6 in rawCurrentProps) {
        if (!rawProps || // for camelCase
        !hasOwn(rawProps, _key6) && ( // it's possible the original props was passed in as kebab-case
        // and converted to camelCase (#955)
        (kebabKey = hyphenate(_key6)) === _key6 || !hasOwn(rawProps, kebabKey))) {
          if (options) {
            if (rawPrevProps && ( // for camelCase
            rawPrevProps[_key6] !== undefined || // for kebab-case
            rawPrevProps[kebabKey] !== undefined)) {
              props[_key6] = resolvePropValue(options, rawCurrentProps, _key6, undefined, instance, true
              /* isAbsent */
              );
            }
          } else {
            delete props[_key6];
          }
        }
      } // in the case of functional component w/o props declaration, props and
      // attrs point to the same object so it should already have been updated.


      if (attrs !== rawCurrentProps) {
        for (var _key7 in attrs) {
          if (!rawProps || !hasOwn(rawProps, _key7)) {
            delete attrs[_key7];
            hasAttrsChanged = true;
          }
        }
      }
    } // trigger updates for $attrs in case it's used in component slots


    if (hasAttrsChanged) {
      trigger(instance, "set"
      /* SET */
      , '$attrs');
    }

    {
      validateProps(rawProps || {}, props, instance);
    }
  }

  function setFullProps(instance, rawProps, props, attrs) {
    var [options, needCastKeys] = instance.propsOptions;
    var hasAttrsChanged = false;
    var rawCastValues;

    if (rawProps) {
      for (var key in rawProps) {
        // key, ref are reserved and never passed down
        if (isReservedProp(key)) {
          continue;
        }

        var value = rawProps[key]; // prop option names are camelized during normalization, so to support
        // kebab -> camel conversion here we need to camelize the key.

        var camelKey = void 0;

        if (options && hasOwn(options, camelKey = camelize(key))) {
          if (!needCastKeys || !needCastKeys.includes(camelKey)) {
            props[camelKey] = value;
          } else {
            (rawCastValues || (rawCastValues = {}))[camelKey] = value;
          }
        } else if (!isEmitListener(instance.emitsOptions, key)) {
          if (value !== attrs[key]) {
            attrs[key] = value;
            hasAttrsChanged = true;
          }
        }
      }
    }

    if (needCastKeys) {
      var rawCurrentProps = toRaw(props);
      var castValues = rawCastValues || EMPTY_OBJ;

      for (var i = 0; i < needCastKeys.length; i++) {
        var _key8 = needCastKeys[i];
        props[_key8] = resolvePropValue(options, rawCurrentProps, _key8, castValues[_key8], instance, !hasOwn(castValues, _key8));
      }
    }

    return hasAttrsChanged;
  }

  function resolvePropValue(options, props, key, value, instance, isAbsent) {
    var opt = options[key];

    if (opt != null) {
      var hasDefault = hasOwn(opt, 'default'); // default values

      if (hasDefault && value === undefined) {
        var defaultValue = opt.default;

        if (opt.type !== Function && isFunction(defaultValue)) {
          var {
            propsDefaults
          } = instance;

          if (key in propsDefaults) {
            value = propsDefaults[key];
          } else {
            setCurrentInstance(instance);
            value = propsDefaults[key] = defaultValue.call(null, props);
            unsetCurrentInstance();
          }
        } else {
          value = defaultValue;
        }
      } // boolean casting


      if (opt[0
      /* shouldCast */
      ]) {
        if (isAbsent && !hasDefault) {
          value = false;
        } else if (opt[1
        /* shouldCastTrue */
        ] && (value === '' || value === hyphenate(key))) {
          value = true;
        }
      }
    }

    return value;
  }

  function normalizePropsOptions(comp, appContext, asMixin = false) {
    var cache = appContext.propsCache;
    var cached = cache.get(comp);

    if (cached) {
      return cached;
    }

    var raw = comp.props;
    var normalized = {};
    var needCastKeys = []; // apply mixin/extends props

    var hasExtends = false;

    if (!isFunction(comp)) {
      var extendProps = raw => {
        hasExtends = true;
        var [props, keys] = normalizePropsOptions(raw, appContext, true);
        extend(normalized, props);
        if (keys) needCastKeys.push(...keys);
      };

      if (!asMixin && appContext.mixins.length) {
        appContext.mixins.forEach(extendProps);
      }

      if (comp.extends) {
        extendProps(comp.extends);
      }

      if (comp.mixins) {
        comp.mixins.forEach(extendProps);
      }
    }

    if (!raw && !hasExtends) {
      cache.set(comp, EMPTY_ARR);
      return EMPTY_ARR;
    }

    if (isArray(raw)) {
      for (var i = 0; i < raw.length; i++) {
        if (!isString(raw[i])) {
          warn$1("props must be strings when using array syntax.", raw[i]);
        }

        var normalizedKey = camelize(raw[i]);

        if (validatePropName(normalizedKey)) {
          normalized[normalizedKey] = EMPTY_OBJ;
        }
      }
    } else if (raw) {
      if (!isObject(raw)) {
        warn$1("invalid props options", raw);
      }

      for (var key in raw) {
        var _normalizedKey = camelize(key);

        if (validatePropName(_normalizedKey)) {
          var opt = raw[key];
          var prop = normalized[_normalizedKey] = isArray(opt) || isFunction(opt) ? {
            type: opt
          } : opt;

          if (prop) {
            var booleanIndex = getTypeIndex(Boolean, prop.type);
            var stringIndex = getTypeIndex(String, prop.type);
            prop[0
            /* shouldCast */
            ] = booleanIndex > -1;
            prop[1
            /* shouldCastTrue */
            ] = stringIndex < 0 || booleanIndex < stringIndex; // if the prop needs boolean casting or default value

            if (booleanIndex > -1 || hasOwn(prop, 'default')) {
              needCastKeys.push(_normalizedKey);
            }
          }
        }
      }
    }

    var res = [normalized, needCastKeys];
    cache.set(comp, res);
    return res;
  }

  function validatePropName(key) {
    if (key[0] !== '$') {
      return true;
    } else {
      warn$1("Invalid prop name: \"".concat(key, "\" is a reserved property."));
    }

    return false;
  } // use function string name to check type constructors
  // so that it works across vms / iframes.


  function getType(ctor) {
    var match = ctor && ctor.toString().match(/^\s*function (\w+)/);
    return match ? match[1] : ctor === null ? 'null' : '';
  }

  function isSameType(a, b) {
    return getType(a) === getType(b);
  }

  function getTypeIndex(type, expectedTypes) {
    if (isArray(expectedTypes)) {
      return expectedTypes.findIndex(t => isSameType(t, type));
    } else if (isFunction(expectedTypes)) {
      return isSameType(expectedTypes, type) ? 0 : -1;
    }

    return -1;
  }
  /**
   * dev only
   */


  function validateProps(rawProps, props, instance) {
    var resolvedValues = toRaw(props);
    var options = instance.propsOptions[0];

    for (var key in options) {
      var opt = options[key];
      if (opt == null) continue;
      validateProp(key, resolvedValues[key], opt, !hasOwn(rawProps, key) && !hasOwn(rawProps, hyphenate(key)));
    }
  }
  /**
   * dev only
   */


  function validateProp(name, value, prop, isAbsent) {
    var {
      type,
      required,
      validator
    } = prop; // required!

    if (required && isAbsent) {
      warn$1('Missing required prop: "' + name + '"');
      return;
    } // missing but optional


    if (value == null && !prop.required) {
      return;
    } // type check


    if (type != null && type !== true) {
      var isValid = false;
      var types = isArray(type) ? type : [type];
      var expectedTypes = []; // value is valid as long as one of the specified types match

      for (var i = 0; i < types.length && !isValid; i++) {
        var {
          valid,
          expectedType
        } = assertType(value, types[i]);
        expectedTypes.push(expectedType || '');
        isValid = valid;
      }

      if (!isValid) {
        warn$1(getInvalidTypeMessage(name, value, expectedTypes));
        return;
      }
    } // custom validator


    if (validator && !validator(value)) {
      warn$1('Invalid prop: custom validator check failed for prop "' + name + '".');
    }
  }

  var isSimpleType = /*#__PURE__*/makeMap('String,Number,Boolean,Function,Symbol,BigInt');
  /**
   * dev only
   */

  function assertType(value, type) {
    var valid;
    var expectedType = getType(type);

    if (isSimpleType(expectedType)) {
      var t = typeof value;
      valid = t === expectedType.toLowerCase(); // for primitive wrapper objects

      if (!valid && t === 'object') {
        valid = value instanceof type;
      }
    } else if (expectedType === 'Object') {
      valid = isObject(value);
    } else if (expectedType === 'Array') {
      valid = isArray(value);
    } else if (expectedType === 'null') {
      valid = value === null;
    } else {
      valid = value instanceof type;
    }

    return {
      valid,
      expectedType
    };
  }
  /**
   * dev only
   */


  function getInvalidTypeMessage(name, value, expectedTypes) {
    var message = "Invalid prop: type check failed for prop \"".concat(name, "\".") + " Expected ".concat(expectedTypes.map(capitalize).join(' | '));
    var expectedType = expectedTypes[0];
    var receivedType = toRawType(value);
    var expectedValue = styleValue(value, expectedType);
    var receivedValue = styleValue(value, receivedType); // check if we need to specify expected value

    if (expectedTypes.length === 1 && isExplicable(expectedType) && !isBoolean(expectedType, receivedType)) {
      message += " with value ".concat(expectedValue);
    }

    message += ", got ".concat(receivedType, " "); // check if we need to specify received value

    if (isExplicable(receivedType)) {
      message += "with value ".concat(receivedValue, ".");
    }

    return message;
  }
  /**
   * dev only
   */


  function styleValue(value, type) {
    if (type === 'String') {
      return "\"".concat(value, "\"");
    } else if (type === 'Number') {
      return "".concat(Number(value));
    } else {
      return "".concat(value);
    }
  }
  /**
   * dev only
   */


  function isExplicable(type) {
    var explicitTypes = ['string', 'number', 'boolean'];
    return explicitTypes.some(elem => type.toLowerCase() === elem);
  }
  /**
   * dev only
   */


  function isBoolean(...args) {
    return args.some(elem => elem.toLowerCase() === 'boolean');
  }

  var isInternalKey = key => key[0] === '_' || key === '$stable';

  var normalizeSlotValue = value => isArray(value) ? value.map(normalizeVNode) : [normalizeVNode(value)];

  var normalizeSlot = (key, rawSlot, ctx) => {
    var normalized = withCtx((...args) => {
      if (currentInstance) {
        warn$1("Slot \"".concat(key, "\" invoked outside of the render function: ") + "this will not track dependencies used in the slot. " + "Invoke the slot function inside the render function instead.");
      }

      return normalizeSlotValue(rawSlot(...args));
    }, ctx);
    normalized._c = false;
    return normalized;
  };

  var normalizeObjectSlots = (rawSlots, slots, instance) => {
    var ctx = rawSlots._ctx;

    for (var key in rawSlots) {
      if (isInternalKey(key)) continue;
      var value = rawSlots[key];

      if (isFunction(value)) {
        slots[key] = normalizeSlot(key, value, ctx);
      } else if (value != null) {
        (function () {
          {
            warn$1("Non-function value encountered for slot \"".concat(key, "\". ") + "Prefer function slots for better performance.");
          }
          var normalized = normalizeSlotValue(value);

          slots[key] = () => normalized;
        })();
      }
    }
  };

  var normalizeVNodeSlots = (instance, children) => {
    if (!isKeepAlive(instance.vnode) && !false) {
      warn$1("Non-function value encountered for default slot. " + "Prefer function slots for better performance.");
    }

    var normalized = normalizeSlotValue(children);

    instance.slots.default = () => normalized;
  };

  var initSlots = (instance, children) => {
    if (instance.vnode.shapeFlag & 32
    /* SLOTS_CHILDREN */
    ) {
      var type = children._;

      if (type) {
        // users can get the shallow readonly version of the slots object through `this.$slots`,
        // we should avoid the proxy object polluting the slots of the internal instance
        instance.slots = toRaw(children); // make compiler marker non-enumerable

        def(children, '_', type);
      } else {
        normalizeObjectSlots(children, instance.slots = {});
      }
    } else {
      instance.slots = {};

      if (children) {
        normalizeVNodeSlots(instance, children);
      }
    }

    def(instance.slots, InternalObjectKey, 1);
  };

  var updateSlots = (instance, children, optimized) => {
    var {
      vnode,
      slots
    } = instance;
    var needDeletionCheck = true;
    var deletionComparisonTarget = EMPTY_OBJ;

    if (vnode.shapeFlag & 32
    /* SLOTS_CHILDREN */
    ) {
      var type = children._;

      if (type) {
        // compiled slots.
        if (isHmrUpdating) {
          // Parent was HMR updated so slot content may have changed.
          // force update slots and mark instance for hmr as well
          extend(slots, children);
        } else if (optimized && type === 1
        /* STABLE */
        ) {
          // compiled AND stable.
          // no need to update, and skip stale slots removal.
          needDeletionCheck = false;
        } else {
          // compiled but dynamic (v-if/v-for on slots) - update slots, but skip
          // normalization.
          extend(slots, children); // #2893
          // when rendering the optimized slots by manually written render function,
          // we need to delete the `slots._` flag if necessary to make subsequent updates reliable,
          // i.e. let the `renderSlot` create the bailed Fragment

          if (!optimized && type === 1
          /* STABLE */
          ) {
            delete slots._;
          }
        }
      } else {
        needDeletionCheck = !children.$stable;
        normalizeObjectSlots(children, slots);
      }

      deletionComparisonTarget = children;
    } else if (children) {
      // non slot object children (direct value) passed to a component
      normalizeVNodeSlots(instance, children);
      deletionComparisonTarget = {
        default: 1
      };
    } // delete stale slots


    if (needDeletionCheck) {
      for (var key in slots) {
        if (!isInternalKey(key) && !(key in deletionComparisonTarget)) {
          delete slots[key];
        }
      }
    }
  };
  /**
  Runtime helper for applying directives to a vnode. Example usage:
  
  const comp = resolveComponent('comp')
  const foo = resolveDirective('foo')
  const bar = resolveDirective('bar')
  
  return withDirectives(h(comp), [
    [foo, this.x],
    [bar, this.y]
  ])
  */


  var isBuiltInDirective = /*#__PURE__*/makeMap('bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text');

  function validateDirectiveName(name) {
    if (isBuiltInDirective(name)) {
      warn$1('Do not use built-in directive ids as custom directive id: ' + name);
    }
  }
  /**
   * Adds directives to a VNode.
   */


  function withDirectives(vnode, directives) {
    var internalInstance = currentRenderingInstance;

    if (internalInstance === null) {
      warn$1("withDirectives can only be used inside render functions.");
      return vnode;
    }

    var instance = internalInstance.proxy;
    var bindings = vnode.dirs || (vnode.dirs = []);

    for (var i = 0; i < directives.length; i++) {
      var [dir, value, arg, modifiers = EMPTY_OBJ] = directives[i];

      if (isFunction(dir)) {
        dir = {
          mounted: dir,
          updated: dir
        };
      }

      if (dir.deep) {
        traverse(value);
      }

      bindings.push({
        dir,
        instance,
        value,
        oldValue: void 0,
        arg,
        modifiers
      });
    }

    return vnode;
  }

  function invokeDirectiveHook(vnode, prevVNode, instance, name) {
    var bindings = vnode.dirs;
    var oldBindings = prevVNode && prevVNode.dirs;

    for (var i = 0; i < bindings.length; i++) {
      var binding = bindings[i];

      if (oldBindings) {
        binding.oldValue = oldBindings[i].value;
      }

      var hook = binding.dir[name];

      if (hook) {
        // disable tracking inside all lifecycle hooks
        // since they can potentially be called inside effects.
        pauseTracking();
        callWithAsyncErrorHandling(hook, instance, 8
        /* DIRECTIVE_HOOK */
        , [vnode.el, binding, vnode, prevVNode]);
        resetTracking();
      }
    }
  }

  function createAppContext() {
    return {
      app: null,
      config: {
        isNativeTag: NO,
        performance: false,
        globalProperties: {},
        optionMergeStrategies: {},
        errorHandler: undefined,
        warnHandler: undefined,
        compilerOptions: {}
      },
      mixins: [],
      components: {},
      directives: {},
      provides: Object.create(null),
      optionsCache: new WeakMap(),
      propsCache: new WeakMap(),
      emitsCache: new WeakMap()
    };
  }

  var uid = 0;

  function createAppAPI(render, hydrate) {
    return function createApp(rootComponent, rootProps = null) {
      if (rootProps != null && !isObject(rootProps)) {
        warn$1("root props passed to app.mount() must be an object.");
        rootProps = null;
      }

      var context = createAppContext();
      var installedPlugins = new Set();
      var isMounted = false;
      var app = context.app = {
        _uid: uid++,
        _component: rootComponent,
        _props: rootProps,
        _container: null,
        _context: context,
        _instance: null,
        version,

        get config() {
          return context.config;
        },

        set config(v) {
          {
            warn$1("app.config cannot be replaced. Modify individual options instead.");
          }
        },

        use(plugin, ...options) {
          if (installedPlugins.has(plugin)) {
            warn$1("Plugin has already been applied to target app.");
          } else if (plugin && isFunction(plugin.install)) {
            installedPlugins.add(plugin);
            plugin.install(app, ...options);
          } else if (isFunction(plugin)) {
            installedPlugins.add(plugin);
            plugin(app, ...options);
          } else {
            warn$1("A plugin must either be a function or an object with an \"install\" " + "function.");
          }

          return app;
        },

        mixin(mixin) {
          {
            if (!context.mixins.includes(mixin)) {
              context.mixins.push(mixin);
            } else {
              warn$1('Mixin has already been applied to target app' + (mixin.name ? ": ".concat(mixin.name) : ''));
            }
          }
          return app;
        },

        component(name, component) {
          {
            validateComponentName(name, context.config);
          }

          if (!component) {
            return context.components[name];
          }

          if (context.components[name]) {
            warn$1("Component \"".concat(name, "\" has already been registered in target app."));
          }

          context.components[name] = component;
          return app;
        },

        directive(name, directive) {
          {
            validateDirectiveName(name);
          }

          if (!directive) {
            return context.directives[name];
          }

          if (context.directives[name]) {
            warn$1("Directive \"".concat(name, "\" has already been registered in target app."));
          }

          context.directives[name] = directive;
          return app;
        },

        mount(rootContainer, isHydrate, isSVG) {
          if (!isMounted) {
            var vnode = createVNode(rootComponent, rootProps); // store app context on the root VNode.
            // this will be set on the root instance on initial mount.

            vnode.appContext = context; // HMR root reload

            {
              context.reload = () => {
                render(cloneVNode(vnode), rootContainer, isSVG);
              };
            }

            if (isHydrate && hydrate) {
              hydrate(vnode, rootContainer);
            } else {
              render(vnode, rootContainer, isSVG);
            }

            isMounted = true;
            app._container = rootContainer;
            rootContainer.__vue_app__ = app;
            {
              app._instance = vnode.component;
              devtoolsInitApp(app, version);
            }
            return getExposeProxy(vnode.component) || vnode.component.proxy;
          } else {
            warn$1("App has already been mounted.\n" + "If you want to remount the same app, move your app creation logic " + "into a factory function and create fresh app instances for each " + "mount - e.g. `const createMyApp = () => createApp(App)`");
          }
        },

        unmount() {
          if (isMounted) {
            render(null, app._container);
            {
              app._instance = null;
              devtoolsUnmountApp(app);
            }
            delete app._container.__vue_app__;
          } else {
            warn$1("Cannot unmount an app that is not mounted.");
          }
        },

        provide(key, value) {
          if (key in context.provides) {
            warn$1("App already provides property with key \"".concat(String(key), "\". ") + "It will be overwritten with the new value.");
          } // TypeScript doesn't allow symbols as index type
          // https://github.com/Microsoft/TypeScript/issues/24587


          context.provides[key] = value;
          return app;
        }

      };
      return app;
    };
  }

  var hasMismatch = false;

  var isSVGContainer = container => /svg/.test(container.namespaceURI) && container.tagName !== 'foreignObject';

  var isComment = node => node.nodeType === 8
  /* COMMENT */
  ; // Note: hydration is DOM-specific
  // But we have to place it in core due to tight coupling with core - splitting
  // it out creates a ton of unnecessary complexity.
  // Hydration also depends on some renderer internal logic which needs to be
  // passed in via arguments.


  function createHydrationFunctions(rendererInternals) {
    var {
      mt: mountComponent,
      p: patch,
      o: {
        patchProp,
        nextSibling,
        parentNode,
        remove,
        insert,
        createComment
      }
    } = rendererInternals;

    var hydrate = (vnode, container) => {
      if (!container.hasChildNodes()) {
        warn$1("Attempting to hydrate existing markup but container is empty. " + "Performing full mount instead.");
        patch(null, vnode, container);
        flushPostFlushCbs();
        return;
      }

      hasMismatch = false;
      hydrateNode(container.firstChild, vnode, null, null, null);
      flushPostFlushCbs();

      if (hasMismatch && !false) {
        // this error should show up in production
        console.error("Hydration completed but contains mismatches.");
      }
    };

    var hydrateNode = (node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized = false) => {
      var isFragmentStart = isComment(node) && node.data === '[';

      var onMismatch = () => handleMismatch(node, vnode, parentComponent, parentSuspense, slotScopeIds, isFragmentStart);

      var {
        type,
        ref,
        shapeFlag
      } = vnode;
      var domType = node.nodeType;
      vnode.el = node;
      var nextNode = null;

      switch (type) {
        case Text:
          if (domType !== 3
          /* TEXT */
          ) {
            nextNode = onMismatch();
          } else {
            if (node.data !== vnode.children) {
              hasMismatch = true;
              warn$1("Hydration text mismatch:" + "\n- Client: ".concat(JSON.stringify(node.data)) + "\n- Server: ".concat(JSON.stringify(vnode.children)));
              node.data = vnode.children;
            }

            nextNode = nextSibling(node);
          }

          break;

        case Comment:
          if (domType !== 8
          /* COMMENT */
          || isFragmentStart) {
            nextNode = onMismatch();
          } else {
            nextNode = nextSibling(node);
          }

          break;

        case Static:
          if (domType !== 1
          /* ELEMENT */
          ) {
            nextNode = onMismatch();
          } else {
            // determine anchor, adopt content
            nextNode = node; // if the static vnode has its content stripped during build,
            // adopt it from the server-rendered HTML.

            var needToAdoptContent = !vnode.children.length;

            for (var i = 0; i < vnode.staticCount; i++) {
              if (needToAdoptContent) vnode.children += nextNode.outerHTML;

              if (i === vnode.staticCount - 1) {
                vnode.anchor = nextNode;
              }

              nextNode = nextSibling(nextNode);
            }

            return nextNode;
          }

          break;

        case Fragment:
          if (!isFragmentStart) {
            nextNode = onMismatch();
          } else {
            nextNode = hydrateFragment(node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized);
          }

          break;

        default:
          if (shapeFlag & 1
          /* ELEMENT */
          ) {
            if (domType !== 1
            /* ELEMENT */
            || vnode.type.toLowerCase() !== node.tagName.toLowerCase()) {
              nextNode = onMismatch();
            } else {
              nextNode = hydrateElement(node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized);
            }
          } else if (shapeFlag & 6
          /* COMPONENT */
          ) {
            // when setting up the render effect, if the initial vnode already
            // has .el set, the component will perform hydration instead of mount
            // on its sub-tree.
            vnode.slotScopeIds = slotScopeIds;
            var container = parentNode(node);
            mountComponent(vnode, container, null, parentComponent, parentSuspense, isSVGContainer(container), optimized); // component may be async, so in the case of fragments we cannot rely
            // on component's rendered output to determine the end of the fragment
            // instead, we do a lookahead to find the end anchor node.

            nextNode = isFragmentStart ? locateClosingAsyncAnchor(node) : nextSibling(node); // #3787
            // if component is async, it may get moved / unmounted before its
            // inner component is loaded, so we need to give it a placeholder
            // vnode that matches its adopted DOM.

            if (isAsyncWrapper(vnode)) {
              var subTree;

              if (isFragmentStart) {
                subTree = createVNode(Fragment);
                subTree.anchor = nextNode ? nextNode.previousSibling : container.lastChild;
              } else {
                subTree = node.nodeType === 3 ? createTextVNode('') : createVNode('div');
              }

              subTree.el = node;
              vnode.component.subTree = subTree;
            }
          } else if (shapeFlag & 64
          /* TELEPORT */
          ) {
            if (domType !== 8
            /* COMMENT */
            ) {
              nextNode = onMismatch();
            } else {
              nextNode = vnode.type.hydrate(node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized, rendererInternals, hydrateChildren);
            }
          } else if (shapeFlag & 128
          /* SUSPENSE */
          ) {
            nextNode = vnode.type.hydrate(node, vnode, parentComponent, parentSuspense, isSVGContainer(parentNode(node)), slotScopeIds, optimized, rendererInternals, hydrateNode);
          } else {
            warn$1('Invalid HostVNode type:', type, "(".concat(typeof type, ")"));
          }

      }

      if (ref != null) {
        setRef(ref, null, parentSuspense, vnode);
      }

      return nextNode;
    };

    var hydrateElement = (el, vnode, parentComponent, parentSuspense, slotScopeIds, optimized) => {
      optimized = optimized || !!vnode.dynamicChildren;
      var {
        type,
        props,
        patchFlag,
        shapeFlag,
        dirs
      } = vnode; // #4006 for form elements with non-string v-model value bindings
      // e.g. <option :value="obj">, <input type="checkbox" :true-value="1">

      var forcePatchValue = type === 'input' && dirs || type === 'option'; // skip props & children if this is hoisted static nodes

      if (forcePatchValue || patchFlag !== -1
      /* HOISTED */
      ) {
        if (dirs) {
          invokeDirectiveHook(vnode, null, parentComponent, 'created');
        } // props


        if (props) {
          if (forcePatchValue || !optimized || patchFlag & (16
          /* FULL_PROPS */
          | 32
          /* HYDRATE_EVENTS */
          )) {
            for (var key in props) {
              if (forcePatchValue && key.endsWith('value') || isOn(key) && !isReservedProp(key)) {
                patchProp(el, key, null, props[key], false, undefined, parentComponent);
              }
            }
          } else if (props.onClick) {
            // Fast path for click listeners (which is most often) to avoid
            // iterating through props.
            patchProp(el, 'onClick', null, props.onClick, false, undefined, parentComponent);
          }
        } // vnode / directive hooks


        var vnodeHooks;

        if (vnodeHooks = props && props.onVnodeBeforeMount) {
          invokeVNodeHook(vnodeHooks, parentComponent, vnode);
        }

        if (dirs) {
          invokeDirectiveHook(vnode, null, parentComponent, 'beforeMount');
        }

        if ((vnodeHooks = props && props.onVnodeMounted) || dirs) {
          queueEffectWithSuspense(() => {
            vnodeHooks && invokeVNodeHook(vnodeHooks, parentComponent, vnode);
            dirs && invokeDirectiveHook(vnode, null, parentComponent, 'mounted');
          }, parentSuspense);
        } // children


        if (shapeFlag & 16
        /* ARRAY_CHILDREN */
        && // skip if element has innerHTML / textContent
        !(props && (props.innerHTML || props.textContent))) {
          var next = hydrateChildren(el.firstChild, vnode, el, parentComponent, parentSuspense, slotScopeIds, optimized);
          var _hasWarned = false;

          while (next) {
            hasMismatch = true;

            if (!_hasWarned) {
              warn$1("Hydration children mismatch in <".concat(vnode.type, ">: ") + "server rendered element contains more child nodes than client vdom.");
              _hasWarned = true;
            } // The SSRed DOM contains more nodes than it should. Remove them.


            var cur = next;
            next = next.nextSibling;
            remove(cur);
          }
        } else if (shapeFlag & 8
        /* TEXT_CHILDREN */
        ) {
          if (el.textContent !== vnode.children) {
            hasMismatch = true;
            warn$1("Hydration text content mismatch in <".concat(vnode.type, ">:\n") + "- Client: ".concat(el.textContent, "\n") + "- Server: ".concat(vnode.children));
            el.textContent = vnode.children;
          }
        }
      }

      return el.nextSibling;
    };

    var hydrateChildren = (node, parentVNode, container, parentComponent, parentSuspense, slotScopeIds, optimized) => {
      optimized = optimized || !!parentVNode.dynamicChildren;
      var children = parentVNode.children;
      var l = children.length;
      var hasWarned = false;

      for (var i = 0; i < l; i++) {
        var vnode = optimized ? children[i] : children[i] = normalizeVNode(children[i]);

        if (node) {
          node = hydrateNode(node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized);
        } else if (vnode.type === Text && !vnode.children) {
          continue;
        } else {
          hasMismatch = true;

          if (!hasWarned) {
            warn$1("Hydration children mismatch in <".concat(container.tagName.toLowerCase(), ">: ") + "server rendered element contains fewer child nodes than client vdom.");
            hasWarned = true;
          } // the SSRed DOM didn't contain enough nodes. Mount the missing ones.


          patch(null, vnode, container, null, parentComponent, parentSuspense, isSVGContainer(container), slotScopeIds);
        }
      }

      return node;
    };

    var hydrateFragment = (node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized) => {
      var {
        slotScopeIds: fragmentSlotScopeIds
      } = vnode;

      if (fragmentSlotScopeIds) {
        slotScopeIds = slotScopeIds ? slotScopeIds.concat(fragmentSlotScopeIds) : fragmentSlotScopeIds;
      }

      var container = parentNode(node);
      var next = hydrateChildren(nextSibling(node), vnode, container, parentComponent, parentSuspense, slotScopeIds, optimized);

      if (next && isComment(next) && next.data === ']') {
        return nextSibling(vnode.anchor = next);
      } else {
        // fragment didn't hydrate successfully, since we didn't get a end anchor
        // back. This should have led to node/children mismatch warnings.
        hasMismatch = true; // since the anchor is missing, we need to create one and insert it

        insert(vnode.anchor = createComment("]", container), container, next); // fixed by xxxxxx

        return next;
      }
    };

    var handleMismatch = (node, vnode, parentComponent, parentSuspense, slotScopeIds, isFragment) => {
      hasMismatch = true;
      warn$1("Hydration node mismatch:\n- Client vnode:", vnode.type, "\n- Server rendered DOM:", node, node.nodeType === 3
      /* TEXT */
      ? "(text)" : isComment(node) && node.data === '[' ? "(start of fragment)" : "");
      vnode.el = null;

      if (isFragment) {
        // remove excessive fragment nodes
        var end = locateClosingAsyncAnchor(node);

        while (true) {
          var _next = nextSibling(node);

          if (_next && _next !== end) {
            remove(_next);
          } else {
            break;
          }
        }
      }

      var next = nextSibling(node);
      var container = parentNode(node);
      remove(node);
      patch(null, vnode, container, next, parentComponent, parentSuspense, isSVGContainer(container), slotScopeIds);
      return next;
    };

    var locateClosingAsyncAnchor = node => {
      var match = 0;

      while (node) {
        node = nextSibling(node);

        if (node && isComment(node)) {
          if (node.data === '[') match++;

          if (node.data === ']') {
            if (match === 0) {
              return nextSibling(node);
            } else {
              match--;
            }
          }
        }
      }

      return node;
    };

    return [hydrate, hydrateNode];
  }

  var supported;
  var perf;

  function startMeasure(instance, type) {
    if (instance.appContext.config.performance && isSupported()) {
      perf.mark("vue-".concat(type, "-").concat(instance.uid));
    }

    {
      devtoolsPerfStart(instance, type, supported ? perf.now() : Date.now());
    }
  }

  function endMeasure(instance, type) {
    if (instance.appContext.config.performance && isSupported()) {
      var startTag = "vue-".concat(type, "-").concat(instance.uid);
      var endTag = startTag + ":end";
      perf.mark(endTag);
      perf.measure("<".concat(formatComponentName(instance, instance.type), "> ").concat(type), startTag, endTag);
      perf.clearMarks(startTag);
      perf.clearMarks(endTag);
    }

    {
      devtoolsPerfEnd(instance, type, supported ? perf.now() : Date.now());
    }
  }

  function isSupported() {
    if (supported !== undefined) {
      return supported;
    }
    /* eslint-disable no-restricted-globals */


    if (typeof window !== 'undefined' && window.performance) {
      supported = true;
      perf = window.performance;
    } else {
      supported = false;
    }
    /* eslint-enable no-restricted-globals */


    return supported;
  }
  /**
   * This is only called in esm-bundler builds.
   * It is called when a renderer is created, in `baseCreateRenderer` so that
   * importing runtime-core is side-effects free.
   *
   * istanbul-ignore-next
   */


  function initFeatureFlags() {
    var needWarn = [];

    if (needWarn.length) {
      var multi = needWarn.length > 1;
      console.warn("Feature flag".concat(multi ? "s" : "", " ").concat(needWarn.join(', '), " ").concat(multi ? "are" : "is", " not explicitly defined. You are running the esm-bundler build of Vue, ") + "which expects these compile-time feature flags to be globally injected " + "via the bundler config in order to get better tree-shaking in the " + "production bundle.\n\n" + "For more details, see http://link.vuejs.org/feature-flags.");
    }
  }

  var queuePostRenderEffect = queueEffectWithSuspense;
  /**
   * The createRenderer function accepts two generic arguments:
   * HostNode and HostElement, corresponding to Node and Element types in the
   * host environment. For example, for runtime-dom, HostNode would be the DOM
   * `Node` interface and HostElement would be the DOM `Element` interface.
   *
   * Custom renderers can pass in the platform specific types like this:
   *
   * ``` js
   * const { render, createApp } = createRenderer<Node, Element>({
   *   patchProp,
   *   ...nodeOps
   * })
   * ```
   */

  function createRenderer(options) {
    return baseCreateRenderer(options);
  } // Separate API for creating hydration-enabled renderer.
  // Hydration logic is only used when calling this function, making it
  // tree-shakable.


  function createHydrationRenderer(options) {
    return baseCreateRenderer(options, createHydrationFunctions);
  } // implementation


  function baseCreateRenderer(options, createHydrationFns) {
    // compile-time feature flags check
    {
      initFeatureFlags();
    }
    var target = getGlobalThis();
    target.__VUE__ = true;
    {
      setDevtoolsHook(target.__VUE_DEVTOOLS_GLOBAL_HOOK__, target);
    }
    var {
      insert: hostInsert,
      remove: hostRemove,
      patchProp: hostPatchProp,
      forcePatchProp: hostForcePatchProp,
      // fixed by xxxxxx
      createElement: hostCreateElement,
      createText: hostCreateText,
      createComment: hostCreateComment,
      setText: hostSetText,
      setElementText: hostSetElementText,
      parentNode: hostParentNode,
      nextSibling: hostNextSibling,
      setScopeId: hostSetScopeId = NOOP,
      cloneNode: hostCloneNode,
      insertStaticContent: hostInsertStaticContent
    } = options; // Note: functions inside this closure should use `const xxx = () => {}`
    // style in order to prevent being inlined by minifiers.

    var patch = (n1, n2, container, anchor = null, parentComponent = null, parentSuspense = null, isSVG = false, slotScopeIds = null, optimized = isHmrUpdating ? false : !!n2.dynamicChildren) => {
      if (n1 === n2) {
        return;
      } // patching & not same type, unmount old tree


      if (n1 && !isSameVNodeType(n1, n2)) {
        anchor = getNextHostNode(n1);
        unmount(n1, parentComponent, parentSuspense, true);
        n1 = null;
      }

      if (n2.patchFlag === -2
      /* BAIL */
      ) {
        optimized = false;
        n2.dynamicChildren = null;
      }

      var {
        type,
        ref,
        shapeFlag
      } = n2;

      switch (type) {
        case Text:
          processText(n1, n2, container, anchor);
          break;

        case Comment:
          processCommentNode(n1, n2, container, anchor);
          break;

        case Static:
          if (n1 == null) {
            mountStaticNode(n2, container, anchor, isSVG);
          } else {
            patchStaticNode(n1, n2, container, isSVG);
          }

          break;

        case Fragment:
          processFragment(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
          break;

        default:
          if (shapeFlag & 1
          /* ELEMENT */
          ) {
            processElement(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
          } else if (shapeFlag & 6
          /* COMPONENT */
          ) {
            processComponent(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
          } else if (shapeFlag & 64
          /* TELEPORT */
          ) {
            type.process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, internals);
          } else if (shapeFlag & 128
          /* SUSPENSE */
          ) {
            type.process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, internals);
          } else {
            warn$1('Invalid VNode type:', type, "(".concat(typeof type, ")"));
          }

      } // set ref


      if (ref != null && parentComponent) {
        setRef(ref, n1 && n1.ref, parentSuspense, n2 || n1, !n2);
      }
    };

    var processText = (n1, n2, container, anchor) => {
      if (n1 == null) {
        hostInsert(n2.el = hostCreateText(n2.children, container), // fixed by xxxxxx
        container, anchor);
      } else {
        var el = n2.el = n1.el;

        if (n2.children !== n1.children) {
          hostSetText(el, n2.children);
        }
      }
    };

    var processCommentNode = (n1, n2, container, anchor) => {
      if (n1 == null) {
        hostInsert(n2.el = hostCreateComment(n2.children || '', container), // fixed by xxxxxx
        container, anchor);
      } else {
        // there's no support for dynamic comments
        n2.el = n1.el;
      }
    };

    var mountStaticNode = (n2, container, anchor, isSVG) => {
      [n2.el, n2.anchor] = hostInsertStaticContent(n2.children, container, anchor, isSVG);
    };
    /**
     * Dev / HMR only
     */


    var patchStaticNode = (n1, n2, container, isSVG) => {
      // static nodes are only patched during dev for HMR
      if (n2.children !== n1.children) {
        var anchor = hostNextSibling(n1.anchor); // remove existing

        removeStaticNode(n1);
        [n2.el, n2.anchor] = hostInsertStaticContent(n2.children, container, anchor, isSVG);
      } else {
        n2.el = n1.el;
        n2.anchor = n1.anchor;
      }
    };

    var moveStaticNode = ({
      el,
      anchor
    }, container, nextSibling) => {
      var next;

      while (el && el !== anchor) {
        next = hostNextSibling(el);
        hostInsert(el, container, nextSibling);
        el = next;
      }

      hostInsert(anchor, container, nextSibling);
    };

    var removeStaticNode = ({
      el,
      anchor
    }) => {
      var next;

      while (el && el !== anchor) {
        next = hostNextSibling(el);
        hostRemove(el);
        el = next;
      }

      hostRemove(anchor);
    };

    var processElement = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
      isSVG = isSVG || n2.type === 'svg';

      if (n1 == null) {
        mountElement(n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
      } else {
        patchElement(n1, n2, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
      }
    };

    var mountElement = (vnode, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
      var el;
      var vnodeHook;
      var {
        type,
        props,
        shapeFlag,
        transition,
        patchFlag,
        dirs
      } = vnode;
      {
        el = vnode.el = hostCreateElement( // fixed by xxxxxx
        vnode.type, container); // mount children first, since some props may rely on child content
        // being already rendered, e.g. `<select value>`

        if (shapeFlag & 8
        /* TEXT_CHILDREN */
        ) {
          hostSetElementText(el, vnode.children);
        } else if (shapeFlag & 16
        /* ARRAY_CHILDREN */
        ) {
          mountChildren(vnode.children, el, null, parentComponent, parentSuspense, isSVG && type !== 'foreignObject', slotScopeIds, optimized);
        }

        if (dirs) {
          invokeDirectiveHook(vnode, null, parentComponent, 'created');
        } // props


        if (props) {
          for (var key in props) {
            if (key !== 'value' && !isReservedProp(key)) {
              hostPatchProp(el, key, null, props[key], isSVG, vnode.children, parentComponent, parentSuspense, unmountChildren);
            }
          }
          /**
           * Special case for setting value on DOM elements:
           * - it can be order-sensitive (e.g. should be set *after* min/max, #2325, #4024)
           * - it needs to be forced (#1471)
           * #2353 proposes adding another renderer option to configure this, but
           * the properties affects are so finite it is worth special casing it
           * here to reduce the complexity. (Special casing it also should not
           * affect non-DOM renderers)
           */


          if ('value' in props) {
            hostPatchProp(el, 'value', null, props.value);
          }

          if (vnodeHook = props.onVnodeBeforeMount) {
            invokeVNodeHook(vnodeHook, parentComponent, vnode);
          }
        } // scopeId


        setScopeId(el, vnode, vnode.scopeId, slotScopeIds, parentComponent);
      }
      {
        Object.defineProperty(el, '__vnode', {
          value: vnode,
          enumerable: false
        });
        Object.defineProperty(el, '__vueParentComponent', {
          value: parentComponent,
          enumerable: false
        });
      }

      if (dirs) {
        invokeDirectiveHook(vnode, null, parentComponent, 'beforeMount');
      } // #1583 For inside suspense + suspense not resolved case, enter hook should call when suspense resolved
      // #1689 For inside suspense + suspense resolved case, just call it


      var needCallTransitionHooks = (!parentSuspense || parentSuspense && !parentSuspense.pendingBranch) && transition && !transition.persisted;

      if (needCallTransitionHooks) {
        transition.beforeEnter(el);
      }

      hostInsert(el, container, anchor);

      if ((vnodeHook = props && props.onVnodeMounted) || needCallTransitionHooks || dirs) {
        queuePostRenderEffect(() => {
          vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode);
          needCallTransitionHooks && transition.enter(el);
          dirs && invokeDirectiveHook(vnode, null, parentComponent, 'mounted');
        }, parentSuspense);
      }
    };

    var setScopeId = (el, vnode, scopeId, slotScopeIds, parentComponent) => {
      if (scopeId) {
        hostSetScopeId(el, scopeId);
      }

      if (slotScopeIds) {
        for (var i = 0; i < slotScopeIds.length; i++) {
          hostSetScopeId(el, slotScopeIds[i]);
        }
      }

      if (parentComponent) {
        var subTree = parentComponent.subTree;

        if (subTree.patchFlag > 0 && subTree.patchFlag & 2048
        /* DEV_ROOT_FRAGMENT */
        ) {
          subTree = filterSingleRoot(subTree.children) || subTree;
        }

        if (vnode === subTree) {
          var parentVNode = parentComponent.vnode;
          setScopeId(el, parentVNode, parentVNode.scopeId, parentVNode.slotScopeIds, parentComponent.parent);
        }
      }
    };

    var mountChildren = (children, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, start = 0) => {
      for (var i = start; i < children.length; i++) {
        var child = children[i] = optimized ? cloneIfMounted(children[i]) : normalizeVNode(children[i]);
        patch(null, child, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
      }
    };

    var patchElement = (n1, n2, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
      var el = n2.el = n1.el;
      var {
        patchFlag,
        dynamicChildren,
        dirs
      } = n2; // #1426 take the old vnode's patch flag into account since user may clone a
      // compiler-generated vnode, which de-opts to FULL_PROPS

      patchFlag |= n1.patchFlag & 16
      /* FULL_PROPS */
      ;
      var oldProps = n1.props || EMPTY_OBJ;
      var newProps = n2.props || EMPTY_OBJ;
      var vnodeHook;

      if (vnodeHook = newProps.onVnodeBeforeUpdate) {
        invokeVNodeHook(vnodeHook, parentComponent, n2, n1);
      }

      if (dirs) {
        invokeDirectiveHook(n2, n1, parentComponent, 'beforeUpdate');
      }

      if (isHmrUpdating) {
        // HMR updated, force full diff
        patchFlag = 0;
        optimized = false;
        dynamicChildren = null;
      }

      var areChildrenSVG = isSVG && n2.type !== 'foreignObject';

      if (dynamicChildren) {
        patchBlockChildren(n1.dynamicChildren, dynamicChildren, el, parentComponent, parentSuspense, areChildrenSVG, slotScopeIds);

        if (parentComponent && parentComponent.type.__hmrId) {
          traverseStaticChildren(n1, n2);
        }
      } else if (!optimized) {
        // full diff
        patchChildren(n1, n2, el, null, parentComponent, parentSuspense, areChildrenSVG, slotScopeIds, false);
      }

      if (patchFlag > 0) {
        // the presence of a patchFlag means this element's render code was
        // generated by the compiler and can take the fast path.
        // in this path old node and new node are guaranteed to have the same shape
        // (i.e. at the exact same position in the source template)
        if (patchFlag & 16
        /* FULL_PROPS */
        ) {
          // element props contain dynamic keys, full diff needed
          patchProps(el, n2, oldProps, newProps, parentComponent, parentSuspense, isSVG);
        } else {
          // class
          // this flag is matched when the element has dynamic class bindings.
          if (patchFlag & 2
          /* CLASS */
          ) {
            if (oldProps.class !== newProps.class) {
              hostPatchProp(el, 'class', null, newProps.class, isSVG);
            }
          } // style
          // this flag is matched when the element has dynamic style bindings


          if (patchFlag & 4
          /* STYLE */
          ) {
            hostPatchProp(el, 'style', oldProps.style, newProps.style, isSVG);
          } // props
          // This flag is matched when the element has dynamic prop/attr bindings
          // other than class and style. The keys of dynamic prop/attrs are saved for
          // faster iteration.
          // Note dynamic keys like :[foo]="bar" will cause this optimization to
          // bail out and go through a full diff because we need to unset the old key


          if (patchFlag & 8
          /* PROPS */
          ) {
            // if the flag is present then dynamicProps must be non-null
            var propsToUpdate = n2.dynamicProps;

            for (var i = 0; i < propsToUpdate.length; i++) {
              var key = propsToUpdate[i];
              var prev = oldProps[key];
              var next = newProps[key]; // #1471 force patch value

              if (next !== prev || key === 'value' || hostForcePatchProp && hostForcePatchProp(el, key) // fixed by xxxxxx
              ) {
                hostPatchProp(el, key, prev, next, isSVG, n1.children, parentComponent, parentSuspense, unmountChildren);
              }
            }
          }
        } // text
        // This flag is matched when the element has only dynamic text children.


        if (patchFlag & 1
        /* TEXT */
        ) {
          if (n1.children !== n2.children) {
            hostSetElementText(el, n2.children);
          }
        }
      } else if (!optimized && dynamicChildren == null) {
        // unoptimized, full diff
        patchProps(el, n2, oldProps, newProps, parentComponent, parentSuspense, isSVG);
      }

      if ((vnodeHook = newProps.onVnodeUpdated) || dirs) {
        queuePostRenderEffect(() => {
          vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, n2, n1);
          dirs && invokeDirectiveHook(n2, n1, parentComponent, 'updated');
        }, parentSuspense);
      }
    }; // The fast path for blocks.


    var patchBlockChildren = (oldChildren, newChildren, fallbackContainer, parentComponent, parentSuspense, isSVG, slotScopeIds) => {
      for (var i = 0; i < newChildren.length; i++) {
        var oldVNode = oldChildren[i];
        var newVNode = newChildren[i]; // Determine the container (parent element) for the patch.

        var container = // oldVNode may be an errored async setup() component inside Suspense
        // which will not have a mounted element
        oldVNode.el && ( // - In the case of a Fragment, we need to provide the actual parent
        // of the Fragment itself so it can move its children.
        oldVNode.type === Fragment || // - In the case of different nodes, there is going to be a replacement
        // which also requires the correct parent container
        !isSameVNodeType(oldVNode, newVNode) || // - In the case of a component, it could contain anything.
        oldVNode.shapeFlag & (6
        /* COMPONENT */
        | 64
        /* TELEPORT */
        )) ? hostParentNode(oldVNode.el) : // In other cases, the parent container is not actually used so we
        // just pass the block element here to avoid a DOM parentNode call.
        fallbackContainer;
        patch(oldVNode, newVNode, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, true);
      }
    };

    var patchProps = (el, vnode, oldProps, newProps, parentComponent, parentSuspense, isSVG) => {
      if (oldProps !== newProps) {
        for (var key in newProps) {
          // empty string is not valid prop
          if (isReservedProp(key)) continue;
          var next = newProps[key];
          var prev = oldProps[key]; // defer patching value

          if (next !== prev && key !== 'value' || hostForcePatchProp && hostForcePatchProp(el, key) // fixed by xxxxxx
          ) {
            hostPatchProp(el, key, prev, next, isSVG, vnode.children, parentComponent, parentSuspense, unmountChildren);
          }
        }

        if (oldProps !== EMPTY_OBJ) {
          for (var _key9 in oldProps) {
            if (!isReservedProp(_key9) && !(_key9 in newProps)) {
              hostPatchProp(el, _key9, oldProps[_key9], null, isSVG, vnode.children, parentComponent, parentSuspense, unmountChildren);
            }
          }
        }

        if ('value' in newProps) {
          hostPatchProp(el, 'value', oldProps.value, newProps.value);
        }
      }
    };

    var processFragment = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
      var fragmentStartAnchor = n2.el = n1 ? n1.el : hostCreateText('', container); // fixed by xxxxxx

      var fragmentEndAnchor = n2.anchor = n1 ? n1.anchor : hostCreateText('', container); // fixed by xxxxxx

      var {
        patchFlag,
        dynamicChildren,
        slotScopeIds: fragmentSlotScopeIds
      } = n2;

      if (isHmrUpdating) {
        // HMR updated, force full diff
        patchFlag = 0;
        optimized = false;
        dynamicChildren = null;
      } // check if this is a slot fragment with :slotted scope ids


      if (fragmentSlotScopeIds) {
        slotScopeIds = slotScopeIds ? slotScopeIds.concat(fragmentSlotScopeIds) : fragmentSlotScopeIds;
      }

      if (n1 == null) {
        hostInsert(fragmentStartAnchor, container, anchor);
        hostInsert(fragmentEndAnchor, container, anchor); // a fragment can only have array children
        // since they are either generated by the compiler, or implicitly created
        // from arrays.

        mountChildren(n2.children, container, fragmentEndAnchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
      } else {
        if (patchFlag > 0 && patchFlag & 64
        /* STABLE_FRAGMENT */
        && dynamicChildren && // #2715 the previous fragment could've been a BAILed one as a result
        // of renderSlot() with no valid children
        n1.dynamicChildren) {
          // a stable fragment (template root or <template v-for>) doesn't need to
          // patch children order, but it may contain dynamicChildren.
          patchBlockChildren(n1.dynamicChildren, dynamicChildren, container, parentComponent, parentSuspense, isSVG, slotScopeIds);

          if (parentComponent && parentComponent.type.__hmrId) {
            traverseStaticChildren(n1, n2);
          } else if ( // #2080 if the stable fragment has a key, it's a <template v-for> that may
          //  get moved around. Make sure all root level vnodes inherit el.
          // #2134 or if it's a component root, it may also get moved around
          // as the component is being moved.
          n2.key != null || parentComponent && n2 === parentComponent.subTree) {
            traverseStaticChildren(n1, n2, true
            /* shallow */
            );
          }
        } else {
          // keyed / unkeyed, or manual fragments.
          // for keyed & unkeyed, since they are compiler generated from v-for,
          // each child is guaranteed to be a block so the fragment will never
          // have dynamicChildren.
          patchChildren(n1, n2, container, fragmentEndAnchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
        }
      }
    };

    var processComponent = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
      n2.slotScopeIds = slotScopeIds;

      if (n1 == null) {
        if (n2.shapeFlag & 512
        /* COMPONENT_KEPT_ALIVE */
        ) {
          parentComponent.ctx.activate(n2, container, anchor, isSVG, optimized);
        } else {
          mountComponent(n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
        }
      } else {
        updateComponent(n1, n2, optimized);
      }
    };

    var mountComponent = (initialVNode, container, anchor, parentComponent, parentSuspense, isSVG, optimized) => {
      var instance = initialVNode.component = createComponentInstance(initialVNode, parentComponent, parentSuspense);

      if (instance.type.__hmrId) {
        registerHMR(instance);
      }

      {
        pushWarningContext(initialVNode);
        startMeasure(instance, "mount");
      } // inject renderer internals for keepAlive

      if (isKeepAlive(initialVNode)) {
        instance.ctx.renderer = internals;
      } // resolve props and slots for setup context


      {
        {
          startMeasure(instance, "init");
        }
        setupComponent(instance);
        {
          endMeasure(instance, "init");
        }
      } // setup() is async. This component relies on async logic to be resolved
      // before proceeding

      if (instance.asyncDep) {
        parentSuspense && parentSuspense.registerDep(instance, setupRenderEffect); // Give it a placeholder if this is not hydration
        // TODO handle self-defined fallback

        if (!initialVNode.el) {
          var placeholder = instance.subTree = createVNode(Comment);
          processCommentNode(null, placeholder, container, anchor);
        }

        return;
      }

      setupRenderEffect(instance, initialVNode, container, anchor, parentSuspense, isSVG, optimized); // fixed by xxxxxx 对根节点设置ownerid

      if (instance.$wxsModules) {
        var el = resolveOwnerEl(instance);

        if (el) {
          el.setAttribute(ATTR_V_OWNER_ID, instance.uid);
          var {
            $renderjsModules
          } = instance.type;
          $renderjsModules && el.setAttribute(ATTR_V_RENDERJS, $renderjsModules);
        }
      }

      {
        popWarningContext();
        endMeasure(instance, "mount");
      }
    };

    var updateComponent = (n1, n2, optimized) => {
      var instance = n2.component = n1.component;

      if (shouldUpdateComponent(n1, n2, optimized)) {
        if (instance.asyncDep && !instance.asyncResolved) {
          // async & still pending - just update props and slots
          // since the component's reactive effect for render isn't set-up yet
          {
            pushWarningContext(n2);
          }
          updateComponentPreRender(instance, n2, optimized);
          {
            popWarningContext();
          }
          return;
        } else {
          // normal update
          instance.next = n2; // in case the child component is also queued, remove it to avoid
          // double updating the same child component in the same flush.

          invalidateJob(instance.update); // instance.update is the reactive effect.

          instance.update();
        }
      } else {
        // no update needed. just copy over properties
        n2.component = n1.component;
        n2.el = n1.el;
        instance.vnode = n2;
      }
    };

    var setupRenderEffect = (instance, initialVNode, container, anchor, parentSuspense, isSVG, optimized) => {
      var componentUpdateFn = () => {
        if (!instance.isMounted) {
          var vnodeHook;
          var {
            el,
            props
          } = initialVNode;
          var {
            bm,
            m,
            parent
          } = instance;
          var isAsyncWrapperVNode = isAsyncWrapper(initialVNode);
          effect.allowRecurse = false; // beforeMount hook

          if (bm) {
            invokeArrayFns(bm);
          } // onVnodeBeforeMount


          if (!isAsyncWrapperVNode && (vnodeHook = props && props.onVnodeBeforeMount)) {
            invokeVNodeHook(vnodeHook, parent, initialVNode);
          }

          effect.allowRecurse = true;

          if (el && hydrateNode) {
            // vnode has adopted host node - perform hydration instead of mount.
            var hydrateSubTree = () => {
              {
                startMeasure(instance, "render");
              }
              instance.subTree = renderComponentRoot(instance);
              {
                endMeasure(instance, "render");
              }
              {
                startMeasure(instance, "hydrate");
              }
              hydrateNode(el, instance.subTree, instance, parentSuspense, null);
              {
                endMeasure(instance, "hydrate");
              }
            };

            if (isAsyncWrapperVNode) {
              initialVNode.type.__asyncLoader().then( // note: we are moving the render call into an async callback,
              // which means it won't track dependencies - but it's ok because
              // a server-rendered async wrapper is already in resolved state
              // and it will never need to change.
              () => !instance.isUnmounted && hydrateSubTree());
            } else {
              hydrateSubTree();
            }
          } else {
            {
              startMeasure(instance, "render");
            }
            var subTree = instance.subTree = renderComponentRoot(instance);
            {
              endMeasure(instance, "render");
            }
            {
              startMeasure(instance, "patch");
            }
            patch(null, subTree, container, anchor, instance, parentSuspense, isSVG);
            {
              endMeasure(instance, "patch");
            }
            initialVNode.el = subTree.el;
          } // mounted hook


          if (m) {
            queuePostRenderEffect(m, parentSuspense);
          } // onVnodeMounted


          if (!isAsyncWrapperVNode && (vnodeHook = props && props.onVnodeMounted)) {
            var scopedInitialVNode = initialVNode;
            queuePostRenderEffect(() => invokeVNodeHook(vnodeHook, parent, scopedInitialVNode), parentSuspense);
          } // activated hook for keep-alive roots.
          // #1742 activated hook must be accessed after first render
          // since the hook may be injected by a child keep-alive


          if (initialVNode.shapeFlag & 256
          /* COMPONENT_SHOULD_KEEP_ALIVE */
          ) {
            instance.a && queuePostRenderEffect(instance.a, parentSuspense);
          }

          instance.isMounted = true;
          {
            devtoolsComponentAdded(instance);
          } // #2458: deference mount-only object parameters to prevent memleaks

          initialVNode = container = anchor = null;
        } else {
          // updateComponent
          // This is triggered by mutation of component's own state (next: null)
          // OR parent calling processComponent (next: VNode)
          var {
            next,
            bu,
            u,
            parent: _parent,
            vnode
          } = instance;
          var originNext = next;

          var _vnodeHook;

          {
            pushWarningContext(next || instance.vnode);
          } // Disallow component effect recursion during pre-lifecycle hooks.

          effect.allowRecurse = false;

          if (next) {
            next.el = vnode.el;
            updateComponentPreRender(instance, next, optimized);
          } else {
            next = vnode;
          } // beforeUpdate hook


          if (bu) {
            invokeArrayFns(bu);
          } // onVnodeBeforeUpdate


          if (_vnodeHook = next.props && next.props.onVnodeBeforeUpdate) {
            invokeVNodeHook(_vnodeHook, _parent, next, vnode);
          }

          effect.allowRecurse = true; // render

          {
            startMeasure(instance, "render");
          }
          var nextTree = renderComponentRoot(instance);
          {
            endMeasure(instance, "render");
          }
          var prevTree = instance.subTree;
          instance.subTree = nextTree;
          {
            startMeasure(instance, "patch");
          }
          patch(prevTree, nextTree, // parent may have changed if it's in a teleport
          hostParentNode(prevTree.el), // anchor may have changed if it's in a fragment
          getNextHostNode(prevTree), instance, parentSuspense, isSVG);
          {
            endMeasure(instance, "patch");
          }
          next.el = nextTree.el;

          if (originNext === null) {
            // self-triggered update. In case of HOC, update parent component
            // vnode el. HOC is indicated by parent instance's subTree pointing
            // to child component's vnode
            updateHOCHostEl(instance, nextTree.el);
          } // updated hook


          if (u) {
            queuePostRenderEffect(u, parentSuspense);
          } // onVnodeUpdated


          if (_vnodeHook = next.props && next.props.onVnodeUpdated) {
            queuePostRenderEffect(() => invokeVNodeHook(_vnodeHook, _parent, next, vnode), parentSuspense);
          }

          {
            devtoolsComponentUpdated(instance);
          }
          {
            popWarningContext();
          }
        }
      }; // create reactive effect for rendering


      var effect = new ReactiveEffect(componentUpdateFn, () => queueJob(instance.update), instance.scope // track it in component's effect scope
      );
      var update = instance.update = effect.run.bind(effect);
      update.id = instance.uid; // allowRecurse
      // #1801, #2043 component render effects should allow recursive updates

      effect.allowRecurse = update.allowRecurse = true;
      {
        effect.onTrack = instance.rtc ? e => invokeArrayFns(instance.rtc, e) : void 0;
        effect.onTrigger = instance.rtg ? e => invokeArrayFns(instance.rtg, e) : void 0; // @ts-ignore (for scheduler)

        update.ownerInstance = instance;
      }
      update();
    };

    var updateComponentPreRender = (instance, nextVNode, optimized) => {
      nextVNode.component = instance;
      var prevProps = instance.vnode.props;
      instance.vnode = nextVNode;
      instance.next = null;
      updateProps(instance, nextVNode.props, prevProps, optimized);
      updateSlots(instance, nextVNode.children, optimized);
      pauseTracking(); // props update may have triggered pre-flush watchers.
      // flush them before the render update.

      flushPreFlushCbs(undefined, instance.update);
      resetTracking();
    };

    var patchChildren = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized = false) => {
      var c1 = n1 && n1.children;
      var prevShapeFlag = n1 ? n1.shapeFlag : 0;
      var c2 = n2.children;
      var {
        patchFlag,
        shapeFlag
      } = n2; // fast path

      if (patchFlag > 0) {
        if (patchFlag & 128
        /* KEYED_FRAGMENT */
        ) {
          // this could be either fully-keyed or mixed (some keyed some not)
          // presence of patchFlag means children are guaranteed to be arrays
          patchKeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
          return;
        } else if (patchFlag & 256
        /* UNKEYED_FRAGMENT */
        ) {
          // unkeyed
          patchUnkeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
          return;
        }
      } // children has 3 possibilities: text, array or no children.


      if (shapeFlag & 8
      /* TEXT_CHILDREN */
      ) {
        // text children fast path
        if (prevShapeFlag & 16
        /* ARRAY_CHILDREN */
        ) {
          unmountChildren(c1, parentComponent, parentSuspense);
        }

        if (c2 !== c1) {
          hostSetElementText(container, c2);
        }
      } else {
        if (prevShapeFlag & 16
        /* ARRAY_CHILDREN */
        ) {
          // prev children was array
          if (shapeFlag & 16
          /* ARRAY_CHILDREN */
          ) {
            // two arrays, cannot assume anything, do full diff
            patchKeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
          } else {
            // no new children, just unmount old
            unmountChildren(c1, parentComponent, parentSuspense, true);
          }
        } else {
          // prev children was text OR null
          // new children is array OR null
          if (prevShapeFlag & 8
          /* TEXT_CHILDREN */
          ) {
            hostSetElementText(container, '');
          } // mount new if array


          if (shapeFlag & 16
          /* ARRAY_CHILDREN */
          ) {
            mountChildren(c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
          }
        }
      }
    };

    var patchUnkeyedChildren = (c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
      c1 = c1 || EMPTY_ARR;
      c2 = c2 || EMPTY_ARR;
      var oldLength = c1.length;
      var newLength = c2.length;
      var commonLength = Math.min(oldLength, newLength);
      var i;

      for (i = 0; i < commonLength; i++) {
        var nextChild = c2[i] = optimized ? cloneIfMounted(c2[i]) : normalizeVNode(c2[i]);
        patch(c1[i], nextChild, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
      }

      if (oldLength > newLength) {
        // remove old
        unmountChildren(c1, parentComponent, parentSuspense, true, false, commonLength);
      } else {
        // mount new
        mountChildren(c2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, commonLength);
      }
    }; // can be all-keyed or mixed


    var patchKeyedChildren = (c1, c2, container, parentAnchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized) => {
      var i = 0;
      var l2 = c2.length;
      var e1 = c1.length - 1; // prev ending index

      var e2 = l2 - 1; // next ending index
      // 1. sync from start
      // (a b) c
      // (a b) d e

      while (i <= e1 && i <= e2) {
        var n1 = c1[i];
        var n2 = c2[i] = optimized ? cloneIfMounted(c2[i]) : normalizeVNode(c2[i]);

        if (isSameVNodeType(n1, n2)) {
          patch(n1, n2, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
        } else {
          break;
        }

        i++;
      } // 2. sync from end
      // a (b c)
      // d e (b c)


      while (i <= e1 && i <= e2) {
        var _n = c1[e1];

        var _n2 = c2[e2] = optimized ? cloneIfMounted(c2[e2]) : normalizeVNode(c2[e2]);

        if (isSameVNodeType(_n, _n2)) {
          patch(_n, _n2, container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
        } else {
          break;
        }

        e1--;
        e2--;
      } // 3. common sequence + mount
      // (a b)
      // (a b) c
      // i = 2, e1 = 1, e2 = 2
      // (a b)
      // c (a b)
      // i = 0, e1 = -1, e2 = 0


      if (i > e1) {
        if (i <= e2) {
          var nextPos = e2 + 1;
          var anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;

          while (i <= e2) {
            patch(null, c2[i] = optimized ? cloneIfMounted(c2[i]) : normalizeVNode(c2[i]), container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
            i++;
          }
        }
      } // 4. common sequence + unmount
      // (a b) c
      // (a b)
      // i = 2, e1 = 2, e2 = 1
      // a (b c)
      // (b c)
      // i = 0, e1 = 0, e2 = -1
      else if (i > e2) {
        while (i <= e1) {
          unmount(c1[i], parentComponent, parentSuspense, true);
          i++;
        }
      } // 5. unknown sequence
      // [i ... e1 + 1]: a b [c d e] f g
      // [i ... e2 + 1]: a b [e d c h] f g
      // i = 2, e1 = 4, e2 = 5
      else {
        var s1 = i; // prev starting index

        var s2 = i; // next starting index
        // 5.1 build key:index map for newChildren

        var keyToNewIndexMap = new Map();

        for (i = s2; i <= e2; i++) {
          var nextChild = c2[i] = optimized ? cloneIfMounted(c2[i]) : normalizeVNode(c2[i]);

          if (nextChild.key != null) {
            if (keyToNewIndexMap.has(nextChild.key)) {
              warn$1("Duplicate keys found during update:", JSON.stringify(nextChild.key), "Make sure keys are unique.");
            }

            keyToNewIndexMap.set(nextChild.key, i);
          }
        } // 5.2 loop through old children left to be patched and try to patch
        // matching nodes & remove nodes that are no longer present


        var j;
        var patched = 0;
        var toBePatched = e2 - s2 + 1;
        var moved = false; // used to track whether any node has moved

        var maxNewIndexSoFar = 0; // works as Map<newIndex, oldIndex>
        // Note that oldIndex is offset by +1
        // and oldIndex = 0 is a special value indicating the new node has
        // no corresponding old node.
        // used for determining longest stable subsequence

        var newIndexToOldIndexMap = new Array(toBePatched);

        for (i = 0; i < toBePatched; i++) {
          newIndexToOldIndexMap[i] = 0;
        }

        for (i = s1; i <= e1; i++) {
          var prevChild = c1[i];

          if (patched >= toBePatched) {
            // all new children have been patched so this can only be a removal
            unmount(prevChild, parentComponent, parentSuspense, true);
            continue;
          }

          var newIndex = void 0;

          if (prevChild.key != null) {
            newIndex = keyToNewIndexMap.get(prevChild.key);
          } else {
            // key-less node, try to locate a key-less node of the same type
            for (j = s2; j <= e2; j++) {
              if (newIndexToOldIndexMap[j - s2] === 0 && isSameVNodeType(prevChild, c2[j])) {
                newIndex = j;
                break;
              }
            }
          }

          if (newIndex === undefined) {
            unmount(prevChild, parentComponent, parentSuspense, true);
          } else {
            newIndexToOldIndexMap[newIndex - s2] = i + 1;

            if (newIndex >= maxNewIndexSoFar) {
              maxNewIndexSoFar = newIndex;
            } else {
              moved = true;
            }

            patch(prevChild, c2[newIndex], container, null, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
            patched++;
          }
        } // 5.3 move and mount
        // generate longest stable subsequence only when nodes have moved


        var increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : EMPTY_ARR;
        j = increasingNewIndexSequence.length - 1; // looping backwards so that we can use last patched node as anchor

        for (i = toBePatched - 1; i >= 0; i--) {
          var nextIndex = s2 + i;
          var _nextChild = c2[nextIndex];

          var _anchor2 = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor;

          if (newIndexToOldIndexMap[i] === 0) {
            // mount new
            patch(null, _nextChild, container, _anchor2, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
          } else if (moved) {
            // move if:
            // There is no stable subsequence (e.g. a reverse)
            // OR current node is not among the stable sequence
            if (j < 0 || i !== increasingNewIndexSequence[j]) {
              move(_nextChild, container, _anchor2, 2
              /* REORDER */
              );
            } else {
              j--;
            }
          }
        }
      }
    };

    var move = (vnode, container, anchor, moveType, parentSuspense = null) => {
      var {
        el,
        type,
        transition,
        children,
        shapeFlag
      } = vnode;

      if (shapeFlag & 6
      /* COMPONENT */
      ) {
        move(vnode.component.subTree, container, anchor, moveType);
        return;
      }

      if (shapeFlag & 128
      /* SUSPENSE */
      ) {
        vnode.suspense.move(container, anchor, moveType);
        return;
      }

      if (shapeFlag & 64
      /* TELEPORT */
      ) {
        type.move(vnode, container, anchor, internals);
        return;
      }

      if (type === Fragment) {
        hostInsert(el, container, anchor);

        for (var i = 0; i < children.length; i++) {
          move(children[i], container, anchor, moveType);
        }

        hostInsert(vnode.anchor, container, anchor);
        return;
      }

      if (type === Static) {
        moveStaticNode(vnode, container, anchor);
        return;
      } // single nodes


      var needTransition = moveType !== 2
      /* REORDER */
      && shapeFlag & 1
      /* ELEMENT */
      && transition;

      if (needTransition) {
        if (moveType === 0
        /* ENTER */
        ) {
          transition.beforeEnter(el);
          hostInsert(el, container, anchor);
          queuePostRenderEffect(() => transition.enter(el), parentSuspense);
        } else {
          var {
            leave,
            delayLeave,
            afterLeave
          } = transition;

          var _remove = () => hostInsert(el, container, anchor);

          var performLeave = () => {
            leave(el, () => {
              _remove();

              afterLeave && afterLeave();
            });
          };

          if (delayLeave) {
            delayLeave(el, _remove, performLeave);
          } else {
            performLeave();
          }
        }
      } else {
        hostInsert(el, container, anchor);
      }
    };

    var unmount = (vnode, parentComponent, parentSuspense, doRemove = false, optimized = false) => {
      var {
        type,
        props,
        ref,
        children,
        dynamicChildren,
        shapeFlag,
        patchFlag,
        dirs
      } = vnode; // unset ref

      if (ref != null) {
        setRef(ref, null, parentSuspense, vnode, true);
      }

      if (shapeFlag & 256
      /* COMPONENT_SHOULD_KEEP_ALIVE */
      ) {
        parentComponent.ctx.deactivate(vnode);
        return;
      }

      var shouldInvokeDirs = shapeFlag & 1
      /* ELEMENT */
      && dirs;
      var shouldInvokeVnodeHook = !isAsyncWrapper(vnode);
      var vnodeHook;

      if (shouldInvokeVnodeHook && (vnodeHook = props && props.onVnodeBeforeUnmount)) {
        invokeVNodeHook(vnodeHook, parentComponent, vnode);
      }

      if (shapeFlag & 6
      /* COMPONENT */
      ) {
        unmountComponent(vnode.component, parentSuspense, doRemove);
      } else {
        if (shapeFlag & 128
        /* SUSPENSE */
        ) {
          vnode.suspense.unmount(parentSuspense, doRemove);
          return;
        }

        if (shouldInvokeDirs) {
          invokeDirectiveHook(vnode, null, parentComponent, 'beforeUnmount');
        }

        if (shapeFlag & 64
        /* TELEPORT */
        ) {
          vnode.type.remove(vnode, parentComponent, parentSuspense, optimized, internals, doRemove);
        } else if (dynamicChildren && ( // #1153: fast path should not be taken for non-stable (v-for) fragments
        type !== Fragment || patchFlag > 0 && patchFlag & 64
        /* STABLE_FRAGMENT */
        )) {
          // fast path for block nodes: only need to unmount dynamic children.
          unmountChildren(dynamicChildren, parentComponent, parentSuspense, false, true);
        } else if (type === Fragment && patchFlag & (128
        /* KEYED_FRAGMENT */
        | 256
        /* UNKEYED_FRAGMENT */
        ) || !optimized && shapeFlag & 16
        /* ARRAY_CHILDREN */
        ) {
          unmountChildren(children, parentComponent, parentSuspense);
        }

        if (doRemove) {
          remove(vnode);
        }
      }

      if (shouldInvokeVnodeHook && (vnodeHook = props && props.onVnodeUnmounted) || shouldInvokeDirs) {
        queuePostRenderEffect(() => {
          vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode);
          shouldInvokeDirs && invokeDirectiveHook(vnode, null, parentComponent, 'unmounted');
        }, parentSuspense);
      }
    };

    var remove = vnode => {
      var {
        type,
        el,
        anchor,
        transition
      } = vnode;

      if (type === Fragment) {
        removeFragment(el, anchor);
        return;
      }

      if (type === Static) {
        removeStaticNode(vnode);
        return;
      }

      var performRemove = () => {
        hostRemove(el);

        if (transition && !transition.persisted && transition.afterLeave) {
          transition.afterLeave();
        }
      };

      if (vnode.shapeFlag & 1
      /* ELEMENT */
      && transition && !transition.persisted) {
        var {
          leave,
          delayLeave
        } = transition;

        var performLeave = () => leave(el, performRemove);

        if (delayLeave) {
          delayLeave(vnode.el, performRemove, performLeave);
        } else {
          performLeave();
        }
      } else {
        performRemove();
      }
    };

    var removeFragment = (cur, end) => {
      // For fragments, directly remove all contained DOM nodes.
      // (fragment child nodes cannot have transition)
      var next;

      while (cur !== end) {
        next = hostNextSibling(cur);
        hostRemove(cur);
        cur = next;
      }

      hostRemove(end);
    };

    var unmountComponent = (instance, parentSuspense, doRemove) => {
      if (instance.type.__hmrId) {
        unregisterHMR(instance);
      }

      var {
        bum,
        scope,
        update,
        subTree,
        um
      } = instance; // beforeUnmount hook

      if (bum) {
        invokeArrayFns(bum);
      } // stop effects in component scope


      scope.stop(); // update may be null if a component is unmounted before its async
      // setup has resolved.

      if (update) {
        // so that scheduler will no longer invoke it
        update.active = false;
        unmount(subTree, instance, parentSuspense, doRemove);
      } // unmounted hook


      if (um) {
        queuePostRenderEffect(um, parentSuspense);
      }

      queuePostRenderEffect(() => {
        instance.isUnmounted = true;
      }, parentSuspense); // A component with async dep inside a pending suspense is unmounted before
      // its async dep resolves. This should remove the dep from the suspense, and
      // cause the suspense to resolve immediately if that was the last dep.

      if (parentSuspense && parentSuspense.pendingBranch && !parentSuspense.isUnmounted && instance.asyncDep && !instance.asyncResolved && instance.suspenseId === parentSuspense.pendingId) {
        parentSuspense.deps--;

        if (parentSuspense.deps === 0) {
          parentSuspense.resolve();
        }
      }

      {
        devtoolsComponentRemoved(instance);
      }
    };

    var unmountChildren = (children, parentComponent, parentSuspense, doRemove = false, optimized = false, start = 0) => {
      for (var i = start; i < children.length; i++) {
        unmount(children[i], parentComponent, parentSuspense, doRemove, optimized);
      }
    };

    var getNextHostNode = vnode => {
      if (vnode.shapeFlag & 6
      /* COMPONENT */
      ) {
        return getNextHostNode(vnode.component.subTree);
      }

      if (vnode.shapeFlag & 128
      /* SUSPENSE */
      ) {
        return vnode.suspense.next();
      }

      return hostNextSibling(vnode.anchor || vnode.el);
    };

    var render = (vnode, container, isSVG) => {
      if (vnode == null) {
        if (container._vnode) {
          unmount(container._vnode, null, null, true);
        }
      } else {
        patch(container._vnode || null, vnode, container, null, null, null, isSVG);
      }

      flushPostFlushCbs();
      container._vnode = vnode;
    };

    var internals = {
      p: patch,
      um: unmount,
      m: move,
      r: remove,
      mt: mountComponent,
      mc: mountChildren,
      pc: patchChildren,
      pbc: patchBlockChildren,
      n: getNextHostNode,
      o: options
    };
    var hydrate;
    var hydrateNode;

    if (createHydrationFns) {
      [hydrate, hydrateNode] = createHydrationFns(internals);
    }

    return {
      render,
      hydrate,
      createApp: createAppAPI(render, hydrate)
    };
  }

  function setRef(rawRef, oldRawRef, parentSuspense, vnode, isUnmount = false) {
    if (isArray(rawRef)) {
      rawRef.forEach((r, i) => setRef(r, oldRawRef && (isArray(oldRawRef) ? oldRawRef[i] : oldRawRef), parentSuspense, vnode, isUnmount));
      return;
    }

    if (isAsyncWrapper(vnode) && !isUnmount) {
      // when mounting async components, nothing needs to be done,
      // because the template ref is forwarded to inner component
      return;
    }

    var refValue = vnode.shapeFlag & 4
    /* STATEFUL_COMPONENT */
    ? getExposeProxy(vnode.component) || vnode.component.proxy : vnode.el;
    var value = isUnmount ? null : refValue;
    var {
      i: owner,
      r: ref
    } = rawRef;

    if (!owner) {
      warn$1("Missing ref owner context. ref cannot be used on hoisted vnodes. " + "A vnode with ref must be created inside the render function.");
      return;
    }

    var oldRef = oldRawRef && oldRawRef.r;
    var refs = owner.refs === EMPTY_OBJ ? owner.refs = {} : owner.refs;
    var setupState = owner.setupState; // dynamic ref changed. unset old ref

    if (oldRef != null && oldRef !== ref) {
      if (isString(oldRef)) {
        refs[oldRef] = null;

        if (hasOwn(setupState, oldRef)) {
          setupState[oldRef] = null;
        }
      } else if (isRef(oldRef)) {
        oldRef.value = null;
      }
    }

    if (isString(ref)) {
      var doSet = () => {
        {
          refs[ref] = value;
        }

        if (hasOwn(setupState, ref)) {
          setupState[ref] = value;
        }
      }; // #1789: for non-null values, set them after render
      // null values means this is unmount and it should not overwrite another
      // ref with the same key


      if (value) {
        doSet.id = -1;
        queuePostRenderEffect(doSet, parentSuspense);
      } else {
        doSet();
      }
    } else if (isRef(ref)) {
      var _doSet = () => {
        ref.value = value;
      };

      if (value) {
        _doSet.id = -1;
        queuePostRenderEffect(_doSet, parentSuspense);
      } else {
        _doSet();
      }
    } else if (isFunction(ref)) {
      callWithErrorHandling(ref, owner, 12
      /* FUNCTION_REF */
      , [value, refs]);
    } else {
      warn$1('Invalid template ref type:', value, "(".concat(typeof value, ")"));
    }
  }

  function invokeVNodeHook(hook, instance, vnode, prevVNode = null) {
    callWithAsyncErrorHandling(hook, instance, 7
    /* VNODE_HOOK */
    , [vnode, prevVNode]);
  }
  /**
   * #1156
   * When a component is HMR-enabled, we need to make sure that all static nodes
   * inside a block also inherit the DOM element from the previous tree so that
   * HMR updates (which are full updates) can retrieve the element for patching.
   *
   * #2080
   * Inside keyed `template` fragment static children, if a fragment is moved,
   * the children will always moved so that need inherit el form previous nodes
   * to ensure correct moved position.
   */


  function traverseStaticChildren(n1, n2, shallow = false) {
    var ch1 = n1.children;
    var ch2 = n2.children;

    if (isArray(ch1) && isArray(ch2)) {
      for (var i = 0; i < ch1.length; i++) {
        // this is only called in the optimized path so array children are
        // guaranteed to be vnodes
        var c1 = ch1[i];
        var c2 = ch2[i];

        if (c2.shapeFlag & 1
        /* ELEMENT */
        && !c2.dynamicChildren) {
          if (c2.patchFlag <= 0 || c2.patchFlag === 32
          /* HYDRATE_EVENTS */
          ) {
            c2 = ch2[i] = cloneIfMounted(ch2[i]);
            c2.el = c1.el;
          }

          if (!shallow) traverseStaticChildren(c1, c2);
        } // also inherit for comment nodes, but not placeholders (e.g. v-if which
        // would have received .el during block patch)


        if (c2.type === Comment && !c2.el) {
          c2.el = c1.el;
        }
      }
    }
  } // https://en.wikipedia.org/wiki/Longest_increasing_subsequence


  function getSequence(arr) {
    var p = arr.slice();
    var result = [0];
    var i, j, u, v, c;
    var len = arr.length;

    for (i = 0; i < len; i++) {
      var arrI = arr[i];

      if (arrI !== 0) {
        j = result[result.length - 1];

        if (arr[j] < arrI) {
          p[i] = j;
          result.push(i);
          continue;
        }

        u = 0;
        v = result.length - 1;

        while (u < v) {
          c = u + v >> 1;

          if (arr[result[c]] < arrI) {
            u = c + 1;
          } else {
            v = c;
          }
        }

        if (arrI < arr[result[u]]) {
          if (u > 0) {
            p[i] = result[u - 1];
          }

          result[u] = i;
        }
      }
    }

    u = result.length;
    v = result[u - 1];

    while (u-- > 0) {
      result[u] = v;
      v = p[v];
    }

    return result;
  }

  var isTeleport = type => type.__isTeleport;

  var isTeleportDisabled = props => props && (props.disabled || props.disabled === '');

  var isTargetSVG = target => typeof SVGElement !== 'undefined' && target instanceof SVGElement;

  var resolveTarget = (props, select) => {
    var targetSelector = props && props.to;

    if (isString(targetSelector)) {
      if (!select) {
        warn$1("Current renderer does not support string target for Teleports. " + "(missing querySelector renderer option)");
        return null;
      } else {
        var target = select(targetSelector);

        if (!target) {
          warn$1("Failed to locate Teleport target with selector \"".concat(targetSelector, "\". ") + "Note the target element must exist before the component is mounted - " + "i.e. the target cannot be rendered by the component itself, and " + "ideally should be outside of the entire Vue component tree.");
        }

        return target;
      }
    } else {
      if (!targetSelector && !isTeleportDisabled(props)) {
        warn$1("Invalid Teleport target: ".concat(targetSelector));
      }

      return targetSelector;
    }
  };

  var TeleportImpl = {
    __isTeleport: true,

    process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized, internals) {
      var {
        mc: mountChildren,
        pc: patchChildren,
        pbc: patchBlockChildren,
        o: {
          insert,
          querySelector,
          createText,
          createComment
        }
      } = internals;
      var disabled = isTeleportDisabled(n2.props);
      var {
        shapeFlag,
        children,
        dynamicChildren
      } = n2; // #3302
      // HMR updated, force full diff

      if (isHmrUpdating) {
        optimized = false;
        dynamicChildren = null;
      }

      if (n1 == null) {
        // insert anchors in the main view
        var placeholder = n2.el = createComment('teleport start', container) // fixed by xxxxxx
        ; // fixed by xxxxxx

        var mainAnchor = n2.anchor = createComment('teleport end', container) // fixed by xxxxxx
        ; // fixed by xxxxxx

        insert(placeholder, container, anchor);
        insert(mainAnchor, container, anchor);
        var target = n2.target = resolveTarget(n2.props, querySelector);
        var targetAnchor = n2.targetAnchor = createText('', container); // fixed by xxxxxx

        if (target) {
          insert(targetAnchor, target); // #2652 we could be teleporting from a non-SVG tree into an SVG tree

          isSVG = isSVG || isTargetSVG(target);
        } else if (!disabled) {
          warn$1('Invalid Teleport target on mount:', target, "(".concat(typeof target, ")"));
        }

        var mount = (container, anchor) => {
          // Teleport *always* has Array children. This is enforced in both the
          // compiler and vnode children normalization.
          if (shapeFlag & 16
          /* ARRAY_CHILDREN */
          ) {
            mountChildren(children, container, anchor, parentComponent, parentSuspense, isSVG, slotScopeIds, optimized);
          }
        };

        if (disabled) {
          mount(container, mainAnchor);
        } else if (target) {
          mount(target, targetAnchor);
        }
      } else {
        // update content
        n2.el = n1.el;

        var _mainAnchor = n2.anchor = n1.anchor;

        var _target = n2.target = n1.target;

        var _targetAnchor = n2.targetAnchor = n1.targetAnchor;

        var wasDisabled = isTeleportDisabled(n1.props);
        var currentContainer = wasDisabled ? container : _target;
        var currentAnchor = wasDisabled ? _mainAnchor : _targetAnchor;
        isSVG = isSVG || isTargetSVG(_target);

        if (dynamicChildren) {
          // fast path when the teleport happens to be a block root
          patchBlockChildren(n1.dynamicChildren, dynamicChildren, currentContainer, parentComponent, parentSuspense, isSVG, slotScopeIds); // even in block tree mode we need to make sure all root-level nodes
          // in the teleport inherit previous DOM references so that they can
          // be moved in future patches.

          traverseStaticChildren(n1, n2, true);
        } else if (!optimized) {
          patchChildren(n1, n2, currentContainer, currentAnchor, parentComponent, parentSuspense, isSVG, slotScopeIds, false);
        }

        if (disabled) {
          if (!wasDisabled) {
            // enabled -> disabled
            // move into main container
            moveTeleport(n2, container, _mainAnchor, internals, 1
            /* TOGGLE */
            );
          }
        } else {
          // target changed
          if ((n2.props && n2.props.to) !== (n1.props && n1.props.to)) {
            var nextTarget = n2.target = resolveTarget(n2.props, querySelector);

            if (nextTarget) {
              moveTeleport(n2, nextTarget, null, internals, 0
              /* TARGET_CHANGE */
              );
            } else {
              warn$1('Invalid Teleport target on update:', _target, "(".concat(typeof _target, ")"));
            }
          } else if (wasDisabled) {
            // disabled -> enabled
            // move into teleport target
            moveTeleport(n2, _target, _targetAnchor, internals, 1
            /* TOGGLE */
            );
          }
        }
      }
    },

    remove(vnode, parentComponent, parentSuspense, optimized, {
      um: unmount,
      o: {
        remove: hostRemove
      }
    }, doRemove) {
      var {
        shapeFlag,
        children,
        anchor,
        targetAnchor,
        target,
        props
      } = vnode;

      if (target) {
        hostRemove(targetAnchor);
      } // an unmounted teleport should always remove its children if not disabled


      if (doRemove || !isTeleportDisabled(props)) {
        hostRemove(anchor);

        if (shapeFlag & 16
        /* ARRAY_CHILDREN */
        ) {
          for (var i = 0; i < children.length; i++) {
            var child = children[i];
            unmount(child, parentComponent, parentSuspense, true, !!child.dynamicChildren);
          }
        }
      }
    },

    move: moveTeleport,
    hydrate: hydrateTeleport
  };

  function moveTeleport(vnode, container, parentAnchor, {
    o: {
      insert
    },
    m: move
  }, moveType = 2
  /* REORDER */
  ) {
    // move target anchor if this is a target change.
    if (moveType === 0
    /* TARGET_CHANGE */
    ) {
      insert(vnode.targetAnchor, container, parentAnchor);
    }

    var {
      el,
      anchor,
      shapeFlag,
      children,
      props
    } = vnode;
    var isReorder = moveType === 2
    /* REORDER */
    ; // move main view anchor if this is a re-order.

    if (isReorder) {
      insert(el, container, parentAnchor);
    } // if this is a re-order and teleport is enabled (content is in target)
    // do not move children. So the opposite is: only move children if this
    // is not a reorder, or the teleport is disabled


    if (!isReorder || isTeleportDisabled(props)) {
      // Teleport has either Array children or no children.
      if (shapeFlag & 16
      /* ARRAY_CHILDREN */
      ) {
        for (var i = 0; i < children.length; i++) {
          move(children[i], container, parentAnchor, 2
          /* REORDER */
          );
        }
      }
    } // move main view anchor if this is a re-order.


    if (isReorder) {
      insert(anchor, container, parentAnchor);
    }
  }

  function hydrateTeleport(node, vnode, parentComponent, parentSuspense, slotScopeIds, optimized, {
    o: {
      nextSibling,
      parentNode,
      querySelector
    }
  }, hydrateChildren) {
    var target = vnode.target = resolveTarget(vnode.props, querySelector);

    if (target) {
      // if multiple teleports rendered to the same target element, we need to
      // pick up from where the last teleport finished instead of the first node
      var targetNode = target._lpa || target.firstChild;

      if (vnode.shapeFlag & 16
      /* ARRAY_CHILDREN */
      ) {
        if (isTeleportDisabled(vnode.props)) {
          vnode.anchor = hydrateChildren(nextSibling(node), vnode, parentNode(node), parentComponent, parentSuspense, slotScopeIds, optimized);
          vnode.targetAnchor = targetNode;
        } else {
          vnode.anchor = nextSibling(node);
          vnode.targetAnchor = hydrateChildren(targetNode, vnode, target, parentComponent, parentSuspense, slotScopeIds, optimized);
        }

        target._lpa = vnode.targetAnchor && nextSibling(vnode.targetAnchor);
      }
    }

    return vnode.anchor && nextSibling(vnode.anchor);
  } // Force-casted public typing for h and TSX props inference


  var Teleport = TeleportImpl;
  var COMPONENTS = 'components';
  var DIRECTIVES = 'directives';
  /**
   * @private
   */

  function resolveComponent(name, maybeSelfReference) {
    return resolveAsset(COMPONENTS, name, true, maybeSelfReference) || name;
  }

  var NULL_DYNAMIC_COMPONENT = Symbol();
  /**
   * @private
   */

  function resolveDynamicComponent(component) {
    if (isString(component)) {
      return resolveAsset(COMPONENTS, component, false) || component;
    } else {
      // invalid types will fallthrough to createVNode and raise warning
      return component || NULL_DYNAMIC_COMPONENT;
    }
  }
  /**
   * @private
   */


  function resolveDirective(name) {
    return resolveAsset(DIRECTIVES, name);
  } // implementation


  function resolveAsset(type, name, warnMissing = true, maybeSelfReference = false) {
    var instance = currentRenderingInstance || currentInstance;

    if (instance) {
      var Component = instance.type; // explicit self name has highest priority

      if (type === COMPONENTS) {
        var selfName = getComponentName(Component);

        if (selfName && (selfName === name || selfName === camelize(name) || selfName === capitalize(camelize(name)))) {
          return Component;
        }
      }

      var res = // local registration
      // check instance[type] first which is resolved for options API
      resolve(instance[type] || Component[type], name) || // window registration
      resolve(instance.appContext[type], name);

      if (!res && maybeSelfReference) {
        // fallback to implicit self-reference
        return Component;
      }

      if (warnMissing && !res) {
        var extra = type === COMPONENTS ? "\nIf this is a native custom element, make sure to exclude it from " + "component resolution via compilerOptions.isCustomElement." : "";
        warn$1("Failed to resolve ".concat(type.slice(0, -1), ": ").concat(name).concat(extra));
      }

      return res;
    } else {
      warn$1("resolve".concat(capitalize(type.slice(0, -1)), " ") + "can only be used in render() or setup().");
    }
  }

  function resolve(registry, name) {
    return registry && (registry[name] || registry[camelize(name)] || registry[capitalize(camelize(name))]);
  }

  var Fragment = Symbol('Fragment');
  var Text = Symbol('Text');
  var Comment = Symbol('Comment');
  var Static = Symbol('Static'); // Since v-if and v-for are the two possible ways node structure can dynamically
  // change, once we consider v-if branches and each v-for fragment a block, we
  // can divide a template into nested blocks, and within each block the node
  // structure would be stable. This allows us to skip most children diffing
  // and only worry about the dynamic nodes (indicated by patch flags).

  var blockStack = [];
  var currentBlock = null;
  /**
   * Open a block.
   * This must be called before `createBlock`. It cannot be part of `createBlock`
   * because the children of the block are evaluated before `createBlock` itself
   * is called. The generated code typically looks like this:
   *
   * ```js
   * function render() {
   *   return (openBlock(),createBlock('div', null, [...]))
   * }
   * ```
   * disableTracking is true when creating a v-for fragment block, since a v-for
   * fragment always diffs its children.
   *
   * @private
   */

  function openBlock(disableTracking = false) {
    blockStack.push(currentBlock = disableTracking ? null : []);
  }

  function closeBlock() {
    blockStack.pop();
    currentBlock = blockStack[blockStack.length - 1] || null;
  } // Whether we should be tracking dynamic child nodes inside a block.
  // Only tracks when this value is > 0
  // We are not using a simple boolean because this value may need to be
  // incremented/decremented by nested usage of v-once (see below)


  var isBlockTreeEnabled = 1;
  /**
   * Block tracking sometimes needs to be disabled, for example during the
   * creation of a tree that needs to be cached by v-once. The compiler generates
   * code like this:
   *
   * ``` js
   * _cache[1] || (
   *   setBlockTracking(-1),
   *   _cache[1] = createVNode(...),
   *   setBlockTracking(1),
   *   _cache[1]
   * )
   * ```
   *
   * @private
   */

  function setBlockTracking(value) {
    isBlockTreeEnabled += value;
  }

  function setupBlock(vnode) {
    // save current block children on the block vnode
    vnode.dynamicChildren = isBlockTreeEnabled > 0 ? currentBlock || EMPTY_ARR : null; // close block

    closeBlock(); // a block is always going to be patched, so track it as a child of its
    // parent block

    if (isBlockTreeEnabled > 0 && currentBlock) {
      currentBlock.push(vnode);
    }

    return vnode;
  }
  /**
   * @private
   */


  function createElementBlock(type, props, children, patchFlag, dynamicProps, shapeFlag) {
    return setupBlock(createBaseVNode(type, props, children, patchFlag, dynamicProps, shapeFlag, true
    /* isBlock */
    ));
  }
  /**
   * Create a block root vnode. Takes the same exact arguments as `createVNode`.
   * A block root keeps track of dynamic nodes within the block in the
   * `dynamicChildren` array.
   *
   * @private
   */


  function createBlock(type, props, children, patchFlag, dynamicProps) {
    return setupBlock(createVNode(type, props, children, patchFlag, dynamicProps, true
    /* isBlock: prevent a block from tracking itself */
    ));
  }

  function isVNode(value) {
    return value ? value.__v_isVNode === true : false;
  }

  function isSameVNodeType(n1, n2) {
    if (n2.shapeFlag & 6
    /* COMPONENT */
    && hmrDirtyComponents.has(n2.type)) {
      // HMR only: if the component has been hot-updated, force a reload.
      return false;
    }

    return n1.type === n2.type && n1.key === n2.key;
  }

  var vnodeArgsTransformer;
  /**
   * Internal API for registering an arguments transform for createVNode
   * used for creating stubs in the test-utils
   * It is *internal* but needs to be exposed for test-utils to pick up proper
   * typings
   */

  function transformVNodeArgs(transformer) {
    vnodeArgsTransformer = transformer;
  }

  var createVNodeWithArgsTransform = (...args) => {
    return _createVNode(...(vnodeArgsTransformer ? vnodeArgsTransformer(args, currentRenderingInstance) : args));
  };

  var InternalObjectKey = "__vInternal";

  var normalizeKey = ({
    key
  }) => key != null ? key : null;

  var normalizeRef = ({
    ref
  }) => {
    return ref != null ? isString(ref) || isRef(ref) || isFunction(ref) ? {
      i: currentRenderingInstance,
      r: ref
    } : ref : null;
  };

  function createBaseVNode(type, props = null, children = null, patchFlag = 0, dynamicProps = null, shapeFlag = type === Fragment ? 0 : 1
  /* ELEMENT */
  , isBlockNode = false, needFullChildrenNormalization = false) {
    var vnode = {
      __v_isVNode: true,
      __v_skip: true,
      type,
      props,
      key: props && normalizeKey(props),
      ref: props && normalizeRef(props),
      scopeId: currentScopeId,
      slotScopeIds: null,
      children,
      component: null,
      suspense: null,
      ssContent: null,
      ssFallback: null,
      dirs: null,
      transition: null,
      el: null,
      anchor: null,
      target: null,
      targetAnchor: null,
      staticCount: 0,
      shapeFlag,
      patchFlag,
      dynamicProps,
      dynamicChildren: null,
      appContext: null
    };

    if (needFullChildrenNormalization) {
      normalizeChildren(vnode, children); // normalize suspense children

      if (shapeFlag & 128
      /* SUSPENSE */
      ) {
        type.normalize(vnode);
      }
    } else if (children) {
      // compiled element vnode - if children is passed, only possible types are
      // string or Array.
      vnode.shapeFlag |= isString(children) ? 8
      /* TEXT_CHILDREN */
      : 16
      /* ARRAY_CHILDREN */
      ;
    } // validate key


    if (vnode.key !== vnode.key) {
      warn$1("VNode created with invalid key (NaN). VNode type:", vnode.type);
    } // track vnode for block tree


    if (isBlockTreeEnabled > 0 && // avoid a block node from tracking itself
    !isBlockNode && // has current parent block
    currentBlock && ( // presence of a patch flag indicates this node needs patching on updates.
    // component nodes also should always be patched, because even if the
    // component doesn't need to update, it needs to persist the instance on to
    // the next vnode so that it can be properly unmounted later.
    vnode.patchFlag > 0 || shapeFlag & 6
    /* COMPONENT */
    ) && // the EVENTS flag is only for hydration and if it is the only flag, the
    // vnode should not be considered dynamic due to handler caching.
    vnode.patchFlag !== 32
    /* HYDRATE_EVENTS */
    ) {
      currentBlock.push(vnode);
    }

    return vnode;
  }

  var createVNode = createVNodeWithArgsTransform;

  function _createVNode(type, props = null, children = null, patchFlag = 0, dynamicProps = null, isBlockNode = false) {
    if (!type || type === NULL_DYNAMIC_COMPONENT) {
      if (!type) {
        warn$1("Invalid vnode type when creating vnode: ".concat(type, "."));
      }

      type = Comment;
    }

    if (isVNode(type)) {
      // createVNode receiving an existing vnode. This happens in cases like
      // <component :is="vnode"/>
      // #2078 make sure to merge refs during the clone instead of overwriting it
      var cloned = cloneVNode(type, props, true
      /* mergeRef: true */
      );

      if (children) {
        normalizeChildren(cloned, children);
      }

      return cloned;
    } // class component normalization.


    if (isClassComponent(type)) {
      type = type.__vccOpts;
    } // class & style normalization.


    if (props) {
      // for reactive or proxy objects, we need to clone it to enable mutation.
      props = guardReactiveProps(props);
      var {
        class: klass,
        style
      } = props;

      if (klass && !isString(klass)) {
        props.class = normalizeClass(klass);
      }

      if (isObject(style)) {
        // reactive state objects need to be cloned since they are likely to be
        // mutated
        if (isProxy(style) && !isArray(style)) {
          style = extend({}, style);
        }

        props.style = normalizeStyle(style);
      }
    } // encode the vnode type information into a bitmap


    var shapeFlag = isString(type) ? 1
    /* ELEMENT */
    : isSuspense(type) ? 128
    /* SUSPENSE */
    : isTeleport(type) ? 64
    /* TELEPORT */
    : isObject(type) ? 4
    /* STATEFUL_COMPONENT */
    : isFunction(type) ? 2
    /* FUNCTIONAL_COMPONENT */
    : 0;

    if (shapeFlag & 4
    /* STATEFUL_COMPONENT */
    && isProxy(type)) {
      type = toRaw(type);
      warn$1("Vue received a Component which was made a reactive object. This can " + "lead to unnecessary performance overhead, and should be avoided by " + "marking the component with `markRaw` or using `shallowRef` " + "instead of `ref`.", "\nComponent that was made reactive: ", type);
    }

    return createBaseVNode(type, props, children, patchFlag, dynamicProps, shapeFlag, isBlockNode, true);
  }

  function guardReactiveProps(props) {
    if (!props) return null;
    return isProxy(props) || InternalObjectKey in props ? extend({}, props) : props;
  }

  function cloneVNode(vnode, extraProps, mergeRef = false) {
    // This is intentionally NOT using spread or extend to avoid the runtime
    // key enumeration cost.
    var {
      props,
      ref,
      patchFlag,
      children
    } = vnode;
    var mergedProps = extraProps ? mergeProps(props || {}, extraProps) : props;
    var cloned = {
      __v_isVNode: true,
      __v_skip: true,
      type: vnode.type,
      props: mergedProps,
      key: mergedProps && normalizeKey(mergedProps),
      ref: extraProps && extraProps.ref ? // #2078 in the case of <component :is="vnode" ref="extra"/>
      // if the vnode itself already has a ref, cloneVNode will need to merge
      // the refs so the single vnode can be set on multiple refs
      mergeRef && ref ? isArray(ref) ? ref.concat(normalizeRef(extraProps)) : [ref, normalizeRef(extraProps)] : normalizeRef(extraProps) : ref,
      scopeId: vnode.scopeId,
      slotScopeIds: vnode.slotScopeIds,
      children: patchFlag === -1
      /* HOISTED */
      && isArray(children) ? children.map(deepCloneVNode) : children,
      target: vnode.target,
      targetAnchor: vnode.targetAnchor,
      staticCount: vnode.staticCount,
      shapeFlag: vnode.shapeFlag,
      // if the vnode is cloned with extra props, we can no longer assume its
      // existing patch flag to be reliable and need to add the FULL_PROPS flag.
      // note: perserve flag for fragments since they use the flag for children
      // fast paths only.
      patchFlag: extraProps && vnode.type !== Fragment ? patchFlag === -1 // hoisted node
      ? 16
      /* FULL_PROPS */
      : patchFlag | 16
      /* FULL_PROPS */
      : patchFlag,
      dynamicProps: vnode.dynamicProps,
      dynamicChildren: vnode.dynamicChildren,
      appContext: vnode.appContext,
      dirs: vnode.dirs,
      transition: vnode.transition,
      // These should technically only be non-null on mounted VNodes. However,
      // they *should* be copied for kept-alive vnodes. So we just always copy
      // them since them being non-null during a mount doesn't affect the logic as
      // they will simply be overwritten.
      component: vnode.component,
      suspense: vnode.suspense,
      ssContent: vnode.ssContent && cloneVNode(vnode.ssContent),
      ssFallback: vnode.ssFallback && cloneVNode(vnode.ssFallback),
      el: vnode.el,
      anchor: vnode.anchor
    };
    return cloned;
  }
  /**
   * Dev only, for HMR of hoisted vnodes reused in v-for
   * https://github.com/vitejs/vite/issues/2022
   */


  function deepCloneVNode(vnode) {
    var cloned = cloneVNode(vnode);

    if (isArray(vnode.children)) {
      cloned.children = vnode.children.map(deepCloneVNode);
    }

    return cloned;
  }
  /**
   * @private
   */


  function createTextVNode(text = ' ', flag = 0) {
    return createVNode(Text, null, text, flag);
  }
  /**
   * @private
   */


  function createStaticVNode(content, numberOfNodes) {
    // A static vnode can contain multiple stringified elements, and the number
    // of elements is necessary for hydration.
    var vnode = createVNode(Static, null, content);
    vnode.staticCount = numberOfNodes;
    return vnode;
  }
  /**
   * @private
   */


  function createCommentVNode(text = '', // when used as the v-else branch, the comment node must be created as a
  // block to ensure correct updates.
  asBlock = false) {
    return asBlock ? (openBlock(), createBlock(Comment, null, text)) : createVNode(Comment, null, text);
  }

  function normalizeVNode(child) {
    if (child == null || typeof child === 'boolean') {
      // empty placeholder
      return createVNode(Comment);
    } else if (isArray(child)) {
      // fragment
      return createVNode(Fragment, null, // #3666, avoid reference pollution when reusing vnode
      child.slice());
    } else if (typeof child === 'object') {
      // already vnode, this should be the most common since compiled templates
      // always produce all-vnode children arrays
      return cloneIfMounted(child);
    } else {
      // strings and numbers
      return createVNode(Text, null, String(child));
    }
  } // optimized normalization for template-compiled render fns


  function cloneIfMounted(child) {
    return child.el === null || child.memo ? child : cloneVNode(child);
  }

  function normalizeChildren(vnode, children) {
    var type = 0;
    var {
      shapeFlag
    } = vnode;

    if (children == null) {
      children = null;
    } else if (isArray(children)) {
      type = 16
      /* ARRAY_CHILDREN */
      ;
    } else if (typeof children === 'object') {
      if (shapeFlag & (1
      /* ELEMENT */
      | 64
      /* TELEPORT */
      )) {
        // Normalize slot to plain children for plain element and Teleport
        var slot = children.default;

        if (slot) {
          // _c marker is added by withCtx() indicating this is a compiled slot
          slot._c && (slot._d = false);
          normalizeChildren(vnode, slot());
          slot._c && (slot._d = true);
        }

        return;
      } else {
        type = 32
        /* SLOTS_CHILDREN */
        ;
        var slotFlag = children._;

        if (!slotFlag && !(InternalObjectKey in children)) {
          children._ctx = currentRenderingInstance;
        } else if (slotFlag === 3
        /* FORWARDED */
        && currentRenderingInstance) {
          // a child component receives forwarded slots from the parent.
          // its slot type is determined by its parent's slot type.
          if (currentRenderingInstance.slots._ === 1
          /* STABLE */
          ) {
            children._ = 1
            /* STABLE */
            ;
          } else {
            children._ = 2
            /* DYNAMIC */
            ;
            vnode.patchFlag |= 1024
            /* DYNAMIC_SLOTS */
            ;
          }
        }
      }
    } else if (isFunction(children)) {
      children = {
        default: children,
        _ctx: currentRenderingInstance
      };
      type = 32
      /* SLOTS_CHILDREN */
      ;
    } else {
      children = String(children); // force teleport children to array so it can be moved around

      if (shapeFlag & 64
      /* TELEPORT */
      ) {
        type = 16
        /* ARRAY_CHILDREN */
        ;
        children = [createTextVNode(children)];
      } else {
        type = 8
        /* TEXT_CHILDREN */
        ;
      }
    }

    vnode.children = children;
    vnode.shapeFlag |= type;
  }

  function mergeProps(...args) {
    var ret = {};

    for (var i = 0; i < args.length; i++) {
      var toMerge = args[i];

      for (var key in toMerge) {
        if (key === 'class') {
          if (ret.class !== toMerge.class) {
            ret.class = normalizeClass([ret.class, toMerge.class]);
          }
        } else if (key === 'style') {
          ret.style = normalizeStyle([ret.style, toMerge.style]);
        } else if (isOn(key)) {
          var existing = ret[key];
          var incoming = toMerge[key];

          if (existing !== incoming) {
            ret[key] = existing ? [].concat(existing, incoming) : incoming;
          }
        } else if (key !== '') {
          ret[key] = toMerge[key];
        }
      }
    }

    return ret;
  }
  /**
   * Actual implementation
   */


  function renderList(source, renderItem, cache, index) {
    var ret;
    var cached = cache && cache[index];

    if (isArray(source) || isString(source)) {
      ret = new Array(source.length);

      for (var i = 0, l = source.length; i < l; i++) {
        ret[i] = renderItem(source[i], i, undefined, cached && cached[i]);
      }
    } else if (typeof source === 'number') {
      if (!Number.isInteger(source)) {
        warn$1("The v-for range expect an integer value but got ".concat(source, "."));
        return [];
      }

      ret = new Array(source);

      for (var _i2 = 0; _i2 < source; _i2++) {
        ret[_i2] = renderItem(_i2 + 1, _i2, undefined, cached && cached[_i2]);
      }
    } else if (isObject(source)) {
      if (source[Symbol.iterator]) {
        ret = Array.from(source, (item, i) => renderItem(item, i, undefined, cached && cached[i]));
      } else {
        var keys = Object.keys(source);
        ret = new Array(keys.length);

        for (var _i3 = 0, _l = keys.length; _i3 < _l; _i3++) {
          var key = keys[_i3];
          ret[_i3] = renderItem(source[key], key, _i3, cached && cached[_i3]);
        }
      }
    } else {
      ret = [];
    }

    if (cache) {
      cache[index] = ret;
    }

    return ret;
  }
  /**
   * Compiler runtime helper for creating dynamic slots object
   * @private
   */


  function createSlots(slots, dynamicSlots) {
    for (var i = 0; i < dynamicSlots.length; i++) {
      var slot = dynamicSlots[i]; // array of dynamic slot generated by <template v-for="..." #[...]>

      if (isArray(slot)) {
        for (var j = 0; j < slot.length; j++) {
          slots[slot[j].name] = slot[j].fn;
        }
      } else if (slot) {
        // conditional single slot generated by <template v-if="..." #foo>
        slots[slot.name] = slot.fn;
      }
    }

    return slots;
  }
  /**
   * Compiler runtime helper for rendering `<slot/>`
   * @private
   */


  function renderSlot(slots, name, props = {}, // this is not a user-facing function, so the fallback is always generated by
  // the compiler and guaranteed to be a function returning an array
  fallback, noSlotted) {
    if (currentRenderingInstance.isCE) {
      return createVNode('slot', name === 'default' ? null : {
        name
      }, fallback && fallback());
    }

    var slot = slots[name];

    if (slot && slot.length > 1) {
      warn$1("SSR-optimized slot function detected in a non-SSR-optimized render " + "function. You need to mark this component with $dynamic-slots in the " + "parent template.");

      slot = () => [];
    } // a compiled slot disables block tracking by default to avoid manual
    // invocation interfering with template-based block tracking, but in
    // `renderSlot` we can be sure that it's template-based so we can force
    // enable it.


    if (slot && slot._c) {
      slot._d = false;
    }

    openBlock();
    var validSlotContent = slot && ensureValidVNode(slot(props));
    var rendered = createBlock(Fragment, {
      key: props.key || "_".concat(name)
    }, validSlotContent || (fallback ? fallback() : []), validSlotContent && slots._ === 1
    /* STABLE */
    ? 64
    /* STABLE_FRAGMENT */
    : -2
    /* BAIL */
    );

    if (!noSlotted && rendered.scopeId) {
      rendered.slotScopeIds = [rendered.scopeId + '-s'];
    }

    if (slot && slot._c) {
      slot._d = true;
    }

    return rendered;
  }

  function ensureValidVNode(vnodes) {
    return vnodes.some(child => {
      if (!isVNode(child)) return true;
      if (child.type === Comment) return false;
      if (child.type === Fragment && !ensureValidVNode(child.children)) return false;
      return true;
    }) ? vnodes : null;
  }
  /**
   * For prefixing keys in v-on="obj" with "on"
   * @private
   */


  function toHandlers(obj) {
    var ret = {};

    if (!isObject(obj)) {
      warn$1("v-on with no argument expects an object value.");
      return ret;
    }

    for (var key in obj) {
      ret[toHandlerKey(key)] = obj[key];
    }

    return ret;
  }
  /**
   * #2437 In Vue 3, functional components do not have a public instance proxy but
   * they exist in the internal parent chain. For code that relies on traversing
   * public $parent chains, skip functional ones and go to the parent instead.
   */


  var getPublicInstance = i => {
    if (!i) return null;
    if (isStatefulComponent(i)) return getExposeProxy(i) || i.proxy;
    return getPublicInstance(i.parent);
  };

  var publicPropertiesMap = extend(Object.create(null), {
    $: i => i,
    $el: i => i.vnode.el,
    $data: i => i.data,
    $props: i => shallowReadonly(i.props),
    $attrs: i => shallowReadonly(i.attrs),
    $slots: i => shallowReadonly(i.slots),
    $refs: i => shallowReadonly(i.refs),
    $parent: i => getPublicInstance(i.parent),
    $root: i => getPublicInstance(i.root),
    $emit: i => i.emit,
    $options: i => resolveMergedOptions(i),
    $forceUpdate: i => () => queueJob(i.update),
    $nextTick: i => nextTick.bind(i.proxy),
    $watch: i => instanceWatch.bind(i)
  });
  var PublicInstanceProxyHandlers = {
    get({
      _: instance
    }, key) {
      var {
        ctx,
        setupState,
        data,
        props,
        accessCache,
        type,
        appContext
      } = instance; // for internal formatters to know that this is a Vue instance

      if (key === '__isVue') {
        return true;
      } // prioritize <script setup> bindings during dev.
      // this allows even properties that start with _ or $ to be used - so that
      // it aligns with the production behavior where the render fn is inlined and
      // indeed has access to all declared variables.


      if (setupState !== EMPTY_OBJ && setupState.__isScriptSetup && hasOwn(setupState, key)) {
        return setupState[key];
      } // data / props / ctx
      // This getter gets called for every property access on the render context
      // during render and is a major hotspot. The most expensive part of this
      // is the multiple hasOwn() calls. It's much faster to do a simple property
      // access on a plain object, so we use an accessCache object (with null
      // prototype) to memoize what access type a key corresponds to.


      var normalizedProps;

      if (key[0] !== '$') {
        var n = accessCache[key];

        if (n !== undefined) {
          switch (n) {
            case 0
            /* SETUP */
            :
              return setupState[key];

            case 1
            /* DATA */
            :
              return data[key];

            case 3
            /* CONTEXT */
            :
              return ctx[key];

            case 2
            /* PROPS */
            :
              return props[key];
            // default: just fallthrough
          }
        } else if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
          accessCache[key] = 0
          /* SETUP */
          ;
          return setupState[key];
        } else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
          accessCache[key] = 1
          /* DATA */
          ;
          return data[key];
        } else if ( // only cache other properties when instance has declared (thus stable)
        // props
        (normalizedProps = instance.propsOptions[0]) && hasOwn(normalizedProps, key)) {
          accessCache[key] = 2
          /* PROPS */
          ;
          return props[key];
        } else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
          accessCache[key] = 3
          /* CONTEXT */
          ;
          return ctx[key];
        } else if (shouldCacheAccess) {
          accessCache[key] = 4
          /* OTHER */
          ;
        }
      }

      var publicGetter = publicPropertiesMap[key];
      var cssModule, globalProperties; // public $xxx properties

      if (publicGetter) {
        if (key === '$attrs') {
          track(instance, "get"
          /* GET */
          , key);
          markAttrsAccessed();
        }

        return publicGetter(instance);
      } else if ( // css module (injected by vue-loader)
      (cssModule = type.__cssModules) && (cssModule = cssModule[key])) {
        return cssModule;
      } else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
        // user may set custom properties to `this` that start with `$`
        accessCache[key] = 3
        /* CONTEXT */
        ;
        return ctx[key];
      } else if ( // window properties
      globalProperties = appContext.config.globalProperties, hasOwn(globalProperties, key)) {
        {
          return globalProperties[key];
        }
      } else if (currentRenderingInstance && (!isString(key) || // #1091 avoid internal isRef/isVNode checks on component instance leading
      // to infinite warning loop
      key.indexOf('__v') !== 0)) {
        if (data !== EMPTY_OBJ && (key[0] === '$' || key[0] === '_') && hasOwn(data, key)) {
          warn$1("Property ".concat(JSON.stringify(key), " must be accessed via $data because it starts with a reserved ") + "character (\"$\" or \"_\") and is not proxied on the render context.");
        } else if (instance === currentRenderingInstance) {
          warn$1("Property ".concat(JSON.stringify(key), " was accessed during render ") + "but is not defined on instance.");
        }
      }
    },

    set({
      _: instance
    }, key, value) {
      var {
        data,
        setupState,
        ctx
      } = instance;

      if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
        setupState[key] = value;
      } else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
        data[key] = value;
      } else if (hasOwn(instance.props, key)) {
        warn$1("Attempting to mutate prop \"".concat(key, "\". Props are readonly."), instance);
        return false;
      }

      if (key[0] === '$' && key.slice(1) in instance) {
        warn$1("Attempting to mutate public property \"".concat(key, "\". ") + "Properties starting with $ are reserved and readonly.", instance);
        return false;
      } else {
        if (key in instance.appContext.config.globalProperties) {
          Object.defineProperty(ctx, key, {
            enumerable: true,
            configurable: true,
            value
          });
        } else {
          ctx[key] = value;
        }
      }

      return true;
    },

    has({
      _: {
        data,
        setupState,
        accessCache,
        ctx,
        appContext,
        propsOptions
      }
    }, key) {
      var normalizedProps;
      return accessCache[key] !== undefined || data !== EMPTY_OBJ && hasOwn(data, key) || setupState !== EMPTY_OBJ && hasOwn(setupState, key) || (normalizedProps = propsOptions[0]) && hasOwn(normalizedProps, key) || hasOwn(ctx, key) || hasOwn(publicPropertiesMap, key) || hasOwn(appContext.config.globalProperties, key);
    }

  };
  {
    PublicInstanceProxyHandlers.ownKeys = target => {
      warn$1("Avoid app logic that relies on enumerating keys on a component instance. " + "The keys will be empty in production mode to avoid performance overhead.");
      return Reflect.ownKeys(target);
    };
  }
  var RuntimeCompiledPublicInstanceProxyHandlers = /*#__PURE__*/extend({}, PublicInstanceProxyHandlers, {
    get(target, key) {
      // fast path for unscopables when using `with` block
      if (key === Symbol.unscopables) {
        return;
      }

      return PublicInstanceProxyHandlers.get(target, key, target);
    },

    has(_, key) {
      var has = key[0] !== '_' && !isGloballyWhitelisted(key);

      if (!has && PublicInstanceProxyHandlers.has(_, key)) {
        warn$1("Property ".concat(JSON.stringify(key), " should not start with _ which is a reserved prefix for Vue internals."));
      }

      return has;
    }

  }); // dev only
  // In dev mode, the proxy target exposes the same properties as seen on `this`
  // for easier console inspection. In prod mode it will be an empty object so
  // these properties definitions can be skipped.

  function createDevRenderContext(instance) {
    var target = {}; // expose internal instance for proxy handlers

    Object.defineProperty(target, "_", {
      configurable: true,
      enumerable: false,
      get: () => instance
    }); // expose public properties

    Object.keys(publicPropertiesMap).forEach(key => {
      Object.defineProperty(target, key, {
        configurable: true,
        enumerable: false,
        get: () => publicPropertiesMap[key](instance),
        // intercepted by the proxy so no need for implementation,
        // but needed to prevent set errors
        set: NOOP
      });
    });
    return target;
  } // dev only


  function exposePropsOnRenderContext(instance) {
    var {
      ctx,
      propsOptions: [propsOptions]
    } = instance;

    if (propsOptions) {
      Object.keys(propsOptions).forEach(key => {
        Object.defineProperty(ctx, key, {
          enumerable: true,
          configurable: true,
          get: () => instance.props[key],
          set: NOOP
        });
      });
    }
  } // dev only


  function exposeSetupStateOnRenderContext(instance) {
    var {
      ctx,
      setupState
    } = instance;
    Object.keys(toRaw(setupState)).forEach(key => {
      if (!setupState.__isScriptSetup) {
        if (key[0] === '$' || key[0] === '_') {
          warn$1("setup() return property ".concat(JSON.stringify(key), " should not start with \"$\" or \"_\" ") + "which are reserved prefixes for Vue internals.");
          return;
        }

        Object.defineProperty(ctx, key, {
          enumerable: true,
          configurable: true,
          get: () => setupState[key],
          set: NOOP
        });
      }
    });
  }

  var emptyAppContext = createAppContext();
  var uid$1 = 0;

  function createComponentInstance(vnode, parent, suspense) {
    var type = vnode.type; // inherit parent app context - or - if root, adopt from root vnode

    var appContext = (parent ? parent.appContext : vnode.appContext) || emptyAppContext;
    var instance = {
      uid: uid$1++,
      vnode,
      type,
      parent,
      appContext,
      root: null,
      next: null,
      subTree: null,
      update: null,
      scope: new EffectScope(true
      /* detached */
      ),
      render: null,
      proxy: null,
      exposed: null,
      exposeProxy: null,
      withProxy: null,
      provides: parent ? parent.provides : Object.create(appContext.provides),
      accessCache: null,
      renderCache: [],
      // local resovled assets
      components: null,
      directives: null,
      // resolved props and emits options
      propsOptions: normalizePropsOptions(type, appContext),
      emitsOptions: normalizeEmitsOptions(type, appContext),
      // emit
      emit: null,
      emitted: null,
      // props default value
      propsDefaults: EMPTY_OBJ,
      // inheritAttrs
      inheritAttrs: type.inheritAttrs,
      // state
      ctx: EMPTY_OBJ,
      data: EMPTY_OBJ,
      props: EMPTY_OBJ,
      attrs: EMPTY_OBJ,
      slots: EMPTY_OBJ,
      refs: EMPTY_OBJ,
      setupState: EMPTY_OBJ,
      setupContext: null,
      // suspense related
      suspense,
      suspenseId: suspense ? suspense.pendingId : 0,
      asyncDep: null,
      asyncResolved: false,
      // lifecycle hooks
      // not using enums here because it results in computed properties
      isMounted: false,
      isUnmounted: false,
      isDeactivated: false,
      bc: null,
      c: null,
      bm: null,
      m: null,
      bu: null,
      u: null,
      um: null,
      bum: null,
      da: null,
      a: null,
      rtg: null,
      rtc: null,
      ec: null,
      sp: null
    };
    {
      instance.ctx = createDevRenderContext(instance);
    }
    instance.root = parent ? parent.root : instance;
    instance.emit = emit$1.bind(null, instance); // apply custom element special handling

    if (vnode.ce) {
      vnode.ce(instance);
    }

    return instance;
  }

  var currentInstance = null;

  var getCurrentInstance = () => currentInstance || currentRenderingInstance;

  var setCurrentInstance = instance => {
    currentInstance = instance;
    instance.scope.on();
  };

  var unsetCurrentInstance = () => {
    currentInstance && currentInstance.scope.off();
    currentInstance = null;
  };

  var isBuiltInTag = /*#__PURE__*/makeMap('slot,component');

  function validateComponentName(name, config) {
    var appIsNativeTag = config.isNativeTag || NO;

    if (isBuiltInTag(name) || appIsNativeTag(name)) {
      warn$1('Do not use built-in or reserved HTML elements as component id: ' + name);
    }
  }

  function isStatefulComponent(instance) {
    return instance.vnode.shapeFlag & 4
    /* STATEFUL_COMPONENT */
    ;
  }

  var isInSSRComponentSetup = false;

  function setupComponent(instance, isSSR = false) {
    isInSSRComponentSetup = isSSR;
    var {
      props,
      children
    } = instance.vnode;
    var isStateful = isStatefulComponent(instance);
    initProps(instance, props, isStateful, isSSR);
    initSlots(instance, children);
    var setupResult = isStateful ? setupStatefulComponent(instance, isSSR) : undefined;
    isInSSRComponentSetup = false;
    return setupResult;
  }

  function setupStatefulComponent(instance, isSSR) {
    var Component = instance.type;
    {
      if (Component.name) {
        validateComponentName(Component.name, instance.appContext.config);
      }

      if (Component.components) {
        var names = Object.keys(Component.components);

        for (var i = 0; i < names.length; i++) {
          validateComponentName(names[i], instance.appContext.config);
        }
      }

      if (Component.directives) {
        var _names = Object.keys(Component.directives);

        for (var _i4 = 0; _i4 < _names.length; _i4++) {
          validateDirectiveName(_names[_i4]);
        }
      }

      if (Component.compilerOptions && isRuntimeOnly()) {
        warn$1("\"compilerOptions\" is only supported when using a build of Vue that " + "includes the runtime compiler. Since you are using a runtime-only " + "build, the options should be passed via your build tool config instead.");
      }
    } // 0. create render proxy property access cache

    instance.accessCache = Object.create(null); // 1. create public instance / render proxy
    // also mark it raw so it's never observed

    instance.proxy = markRaw(new Proxy(instance.ctx, PublicInstanceProxyHandlers));
    {
      exposePropsOnRenderContext(instance);
    } // 2. call setup()

    var {
      setup
    } = Component;

    if (setup) {
      var setupContext = instance.setupContext = setup.length > 1 ? createSetupContext(instance) : null;
      setCurrentInstance(instance);
      pauseTracking();
      var setupResult = callWithErrorHandling(setup, instance, 0
      /* SETUP_FUNCTION */
      , [shallowReadonly(instance.props), setupContext]);
      resetTracking();
      unsetCurrentInstance();

      if (isPromise(setupResult)) {
        setupResult.then(unsetCurrentInstance, unsetCurrentInstance);

        if (isSSR) {
          // return the promise so server-renderer can wait on it
          return setupResult.then(resolvedResult => {
            handleSetupResult(instance, resolvedResult, isSSR);
          }).catch(e => {
            handleError(e, instance, 0
            /* SETUP_FUNCTION */
            );
          });
        } else {
          // async setup returned Promise.
          // bail here and wait for re-entry.
          instance.asyncDep = setupResult;
        }
      } else {
        handleSetupResult(instance, setupResult, isSSR);
      }
    } else {
      finishComponentSetup(instance, isSSR);
    }
  }

  function handleSetupResult(instance, setupResult, isSSR) {
    if (isFunction(setupResult)) {
      // setup returned an inline render function
      if (instance.type.__ssrInlineRender) {
        // when the function's name is `ssrRender` (compiled by SFC inline mode),
        // set it as ssrRender instead.
        instance.ssrRender = setupResult;
      } else {
        instance.render = setupResult;
      }
    } else if (isObject(setupResult)) {
      if (isVNode(setupResult)) {
        warn$1("setup() should not return VNodes directly - " + "return a render function instead.");
      } // setup returned bindings.
      // assuming a render function compiled from template is present.


      {
        instance.devtoolsRawSetupState = setupResult;
      }
      instance.setupState = proxyRefs(setupResult);
      {
        exposeSetupStateOnRenderContext(instance);
      }
    } else if (setupResult !== undefined) {
      warn$1("setup() should return an object. Received: ".concat(setupResult === null ? 'null' : typeof setupResult));
    }

    finishComponentSetup(instance, isSSR);
  }

  var compile;
  var installWithProxy;
  /**
   * For runtime-dom to register the compiler.
   * Note the exported method uses any to avoid d.ts relying on the compiler types.
   */

  function registerRuntimeCompiler(_compile) {
    compile = _compile;

    installWithProxy = i => {
      if (i.render._rc) {
        i.withProxy = new Proxy(i.ctx, RuntimeCompiledPublicInstanceProxyHandlers);
      }
    };
  } // dev only


  var isRuntimeOnly = () => !compile;

  function finishComponentSetup(instance, isSSR, skipOptions) {
    var Component = instance.type; // template / render function normalization
    // could be already set when returned from setup()

    if (!instance.render) {
      // only do on-the-fly compile if not in SSR - SSR on-the-fly compliation
      // is done by server-renderer
      if (!isSSR && compile && !Component.render) {
        var template = Component.template;

        if (template) {
          {
            startMeasure(instance, "compile");
          }
          var {
            isCustomElement,
            compilerOptions
          } = instance.appContext.config;
          var {
            delimiters,
            compilerOptions: componentCompilerOptions
          } = Component;
          var finalCompilerOptions = extend(extend({
            isCustomElement,
            delimiters
          }, compilerOptions), componentCompilerOptions);
          Component.render = compile(template, finalCompilerOptions);
          {
            endMeasure(instance, "compile");
          }
        }
      }

      instance.render = Component.render || NOOP; // for runtime-compiled render functions using `with` blocks, the render
      // proxy used needs a different `has` handler which is more performant and
      // also only allows a whitelist of globals to fallthrough.

      if (installWithProxy) {
        installWithProxy(instance);
      }
    } // support for 2.x options


    {
      setCurrentInstance(instance);
      pauseTracking();
      applyOptions(instance);
      resetTracking();
      unsetCurrentInstance();
    } // warn missing template/render
    // the runtime compilation of template in SSR is done by server-render

    if (!Component.render && instance.render === NOOP && !isSSR) {
      /* istanbul ignore if */
      if (!compile && Component.template) {
        warn$1("Component provided template option but " + "runtime compilation is not supported in this build of Vue." + " Configure your bundler to alias \"vue\" to \"vue/dist/vue.esm-bundler.js\"."
        /* should not happen */
        );
      } else {
        warn$1("Component is missing template or render function.");
      }
    }
  }

  function createAttrsProxy(instance) {
    return new Proxy(instance.attrs, {
      get(target, key) {
        markAttrsAccessed();
        track(instance, "get"
        /* GET */
        , '$attrs');
        return target[key];
      },

      set() {
        warn$1("setupContext.attrs is readonly.");
        return false;
      },

      deleteProperty() {
        warn$1("setupContext.attrs is readonly.");
        return false;
      }

    });
  }

  function createSetupContext(instance) {
    var expose = exposed => {
      if (instance.exposed) {
        warn$1("expose() should be called only once per setup().");
      }

      instance.exposed = exposed || {};
    };

    var attrs;
    {
      // We use getters in dev in case libs like test-utils overwrite instance
      // properties (overwrites should not be done in prod)
      return Object.freeze({
        get attrs() {
          return attrs || (attrs = createAttrsProxy(instance));
        },

        get slots() {
          return shallowReadonly(instance.slots);
        },

        get emit() {
          return (event, ...args) => instance.emit(event, ...args);
        },

        expose
      });
    }
  }

  function getExposeProxy(instance) {
    if (instance.exposed) {
      return instance.exposeProxy || (instance.exposeProxy = new Proxy(proxyRefs(markRaw(instance.exposed)), {
        get(target, key) {
          if (key in target) {
            return target[key];
          } else if (key in publicPropertiesMap) {
            return publicPropertiesMap[key](instance);
          }
        }

      }));
    }
  }

  var classifyRE = /(?:^|[-_])(\w)/g;

  var classify = str => str.replace(classifyRE, c => c.toUpperCase()).replace(/[-_]/g, '');

  function getComponentName(Component) {
    return isFunction(Component) ? Component.displayName || Component.name : Component.name;
  }
  /* istanbul ignore next */


  function formatComponentName(instance, Component, isRoot = false) {
    var name = getComponentName(Component);

    if (!name && Component.__file) {
      var match = Component.__file.match(/([^/\\]+)\.\w+$/);

      if (match) {
        name = match[1];
      }
    }

    if (!name && instance && instance.parent) {
      // try to infer the name based on reverse resolution
      var inferFromRegistry = registry => {
        for (var key in registry) {
          if (registry[key] === Component) {
            return key;
          }
        }
      };

      name = inferFromRegistry(instance.components || instance.parent.type.components) || inferFromRegistry(instance.appContext.components);
    }

    return name ? classify(name) : isRoot ? "App" : "Anonymous";
  }

  function isClassComponent(value) {
    return isFunction(value) && '__vccOpts' in value;
  }

  var stack = [];

  function pushWarningContext(vnode) {
    stack.push(vnode);
  }

  function popWarningContext() {
    stack.pop();
  }

  function warn$1(msg, ...args) {
    // avoid props formatting or warn handler tracking deps that might be mutated
    // during patch, leading to infinite recursion.
    pauseTracking();
    var instance = stack.length ? stack[stack.length - 1].component : null;
    var appWarnHandler = instance && instance.appContext.config.warnHandler;
    var trace = getComponentTrace();

    if (appWarnHandler) {
      callWithErrorHandling(appWarnHandler, instance, 11
      /* APP_WARN_HANDLER */
      , [msg + args.join(''), instance && instance.proxy, trace.map(({
        vnode
      }) => "at <".concat(formatComponentName(instance, vnode.type), ">")).join('\n'), trace]);
    } else {
      var warnArgs = ["[Vue warn]: ".concat(msg), ...args];
      /* istanbul ignore if */

      if (trace.length && // avoid spamming console during tests
      !false) {
        warnArgs.push("\n", ...formatTrace(trace));
      }

      console.warn(...warnArgs);
    }

    resetTracking();
  }

  function getComponentTrace() {
    var currentVNode = stack[stack.length - 1];

    if (!currentVNode) {
      return [];
    } // we can't just use the stack because it will be incomplete during updates
    // that did not start from the root. Re-construct the parent chain using
    // instance parent pointers.


    var normalizedStack = [];

    while (currentVNode) {
      var last = normalizedStack[0];

      if (last && last.vnode === currentVNode) {
        last.recurseCount++;
      } else {
        normalizedStack.push({
          vnode: currentVNode,
          recurseCount: 0
        });
      }

      var parentInstance = currentVNode.component && currentVNode.component.parent;
      currentVNode = parentInstance && parentInstance.vnode;
    }

    return normalizedStack;
  }
  /* istanbul ignore next */


  function formatTrace(trace) {
    var logs = [];
    trace.forEach((entry, i) => {
      logs.push(...(i === 0 ? [] : ["\n"]), ...formatTraceEntry(entry));
    });
    return logs;
  }

  function formatTraceEntry({
    vnode,
    recurseCount
  }) {
    var postfix = recurseCount > 0 ? "... (".concat(recurseCount, " recursive calls)") : "";
    var isRoot = vnode.component ? vnode.component.parent == null : false;
    var open = " at <".concat(formatComponentName(vnode.component, vnode.type, isRoot));
    var close = ">" + postfix;
    return vnode.props ? [open, ...formatProps(vnode.props), close] : [open + close];
  }
  /* istanbul ignore next */


  function formatProps(props) {
    var res = [];
    var keys = Object.keys(props);
    keys.slice(0, 3).forEach(key => {
      res.push(...formatProp(key, props[key]));
    });

    if (keys.length > 3) {
      res.push(" ...");
    }

    return res;
  }
  /* istanbul ignore next */


  function formatProp(key, value, raw) {
    if (isString(value)) {
      value = JSON.stringify(value);
      return raw ? value : ["".concat(key, "=").concat(value)];
    } else if (typeof value === 'number' || typeof value === 'boolean' || value == null) {
      return raw ? value : ["".concat(key, "=").concat(value)];
    } else if (isRef(value)) {
      value = formatProp(key, toRaw(value.value), true);
      return raw ? value : ["".concat(key, "=Ref<"), value, ">"];
    } else if (isFunction(value)) {
      return ["".concat(key, "=fn").concat(value.name ? "<".concat(value.name, ">") : "")];
    } else {
      value = toRaw(value);
      return raw ? value : ["".concat(key, "="), value];
    }
  }

  var ErrorTypeStrings = {
    ["sp"
    /* SERVER_PREFETCH */
    ]: 'serverPrefetch hook',
    ["bc"
    /* BEFORE_CREATE */
    ]: 'beforeCreate hook',
    ["c"
    /* CREATED */
    ]: 'created hook',
    ["bm"
    /* BEFORE_MOUNT */
    ]: 'beforeMount hook',
    ["m"
    /* MOUNTED */
    ]: 'mounted hook',
    ["bu"
    /* BEFORE_UPDATE */
    ]: 'beforeUpdate hook',
    ["u"
    /* UPDATED */
    ]: 'updated',
    ["bum"
    /* BEFORE_UNMOUNT */
    ]: 'beforeUnmount hook',
    ["um"
    /* UNMOUNTED */
    ]: 'unmounted hook',
    ["a"
    /* ACTIVATED */
    ]: 'activated hook',
    ["da"
    /* DEACTIVATED */
    ]: 'deactivated hook',
    ["ec"
    /* ERROR_CAPTURED */
    ]: 'errorCaptured hook',
    ["rtc"
    /* RENDER_TRACKED */
    ]: 'renderTracked hook',
    ["rtg"
    /* RENDER_TRIGGERED */
    ]: 'renderTriggered hook',
    [0
    /* SETUP_FUNCTION */
    ]: 'setup function',
    [1
    /* RENDER_FUNCTION */
    ]: 'render function',
    [2
    /* WATCH_GETTER */
    ]: 'watcher getter',
    [3
    /* WATCH_CALLBACK */
    ]: 'watcher callback',
    [4
    /* WATCH_CLEANUP */
    ]: 'watcher cleanup function',
    [5
    /* NATIVE_EVENT_HANDLER */
    ]: 'native event handler',
    [6
    /* COMPONENT_EVENT_HANDLER */
    ]: 'component event handler',
    [7
    /* VNODE_HOOK */
    ]: 'vnode hook',
    [8
    /* DIRECTIVE_HOOK */
    ]: 'directive hook',
    [9
    /* TRANSITION_HOOK */
    ]: 'transition hook',
    [10
    /* APP_ERROR_HANDLER */
    ]: 'app errorHandler',
    [11
    /* APP_WARN_HANDLER */
    ]: 'app warnHandler',
    [12
    /* FUNCTION_REF */
    ]: 'ref function',
    [13
    /* ASYNC_COMPONENT_LOADER */
    ]: 'async component loader',
    [14
    /* SCHEDULER */
    ]: 'scheduler flush. This is likely a Vue internals bug. ' + 'Please open an issue at https://new-issue.vuejs.org/?repo=vuejs/vue-next'
  };

  function callWithErrorHandling(fn, instance, type, args) {
    var res;

    try {
      res = args ? fn(...args) : fn();
    } catch (err) {
      handleError(err, instance, type);
    }

    return res;
  }

  function callWithAsyncErrorHandling(fn, instance, type, args) {
    if (isFunction(fn)) {
      var res = callWithErrorHandling(fn, instance, type, args);

      if (res && isPromise(res)) {
        res.catch(err => {
          handleError(err, instance, type);
        });
      }

      return res;
    }

    var values = [];

    for (var i = 0; i < fn.length; i++) {
      values.push(callWithAsyncErrorHandling(fn[i], instance, type, args));
    }

    return values;
  }

  function handleError(err, instance, type, throwInDev = true) {
    var contextVNode = instance ? instance.vnode : null;

    if (instance) {
      var cur = instance.parent; // the exposed instance is the render proxy to keep it consistent with 2.x

      var exposedInstance = instance.proxy; // in production the hook receives only the error code

      var errorInfo = ErrorTypeStrings[type];

      while (cur) {
        var errorCapturedHooks = cur.ec;

        if (errorCapturedHooks) {
          for (var i = 0; i < errorCapturedHooks.length; i++) {
            if (errorCapturedHooks[i](err, exposedInstance, errorInfo) === false) {
              return;
            }
          }
        }

        cur = cur.parent;
      } // app-level handling


      var appErrorHandler = instance.appContext.config.errorHandler;

      if (appErrorHandler) {
        callWithErrorHandling(appErrorHandler, null, 10
        /* APP_ERROR_HANDLER */
        , [err, exposedInstance, errorInfo]);
        return;
      }
    }

    logError(err, type, contextVNode, throwInDev);
  }

  function logError(err, type, contextVNode, throwInDev = true) {
    {
      var info = ErrorTypeStrings[type];

      if (contextVNode) {
        pushWarningContext(contextVNode);
      }

      warn$1("Unhandled error".concat(info ? " during execution of ".concat(info) : ""));

      if (contextVNode) {
        popWarningContext();
      } // crash in dev by default so it's more noticeable


      if (throwInDev) {
        // throw err fixed by xxxxxx 避免 error 导致 App 端不可用（比如跳转时报错）
        console.error(err);
      } else {
        console.error(err);
      }
    }
  }

  var isFlushing = false;
  var isFlushPending = false;
  var queue = [];
  var flushIndex = 0;
  var pendingPreFlushCbs = [];
  var activePreFlushCbs = null;
  var preFlushIndex = 0;
  var pendingPostFlushCbs = [];
  var activePostFlushCbs = null;
  var postFlushIndex = 0; // fixed by xxxxxx iOS

  var iOSPromise = {
    then(callback) {
      setTimeout(() => callback(), 0);
    }

  };
  var isIOS = exports.platform === 'iOS';
  var resolvedPromise = isIOS ? iOSPromise : Promise.resolve();
  var currentFlushPromise = null;
  var currentPreFlushParentJob = null;
  var RECURSION_LIMIT = 100;

  function nextTick(fn) {
    var p = currentFlushPromise || resolvedPromise;
    return fn ? p.then(this ? fn.bind(this) : fn) : p;
  } // #2768
  // Use binary-search to find a suitable position in the queue,
  // so that the queue maintains the increasing order of job's id,
  // which can prevent the job from being skipped and also can avoid repeated patching.


  function findInsertionIndex(id) {
    // the start index should be `flushIndex + 1`
    var start = flushIndex + 1;
    var end = queue.length;

    while (start < end) {
      var middle = start + end >>> 1;
      var middleJobId = getId(queue[middle]);
      middleJobId < id ? start = middle + 1 : end = middle;
    }

    return start;
  }

  function queueJob(job) {
    // the dedupe search uses the startIndex argument of Array.includes()
    // by default the search index includes the current job that is being run
    // so it cannot recursively trigger itself again.
    // if the job is a watch() callback, the search will start with a +1 index to
    // allow it recursively trigger itself - it is the user's responsibility to
    // ensure it doesn't end up in an infinite loop.
    if ((!queue.length || !queue.includes(job, isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex)) && job !== currentPreFlushParentJob) {
      if (job.id == null) {
        queue.push(job);
      } else {
        queue.splice(findInsertionIndex(job.id), 0, job);
      }

      queueFlush();
    }
  }

  function queueFlush() {
    if (!isFlushing && !isFlushPending) {
      isFlushPending = true;
      currentFlushPromise = resolvedPromise.then(flushJobs);
    }
  }

  function invalidateJob(job) {
    var i = queue.indexOf(job);

    if (i > flushIndex) {
      queue.splice(i, 1);
    }
  }

  function queueCb(cb, activeQueue, pendingQueue, index) {
    if (!isArray(cb)) {
      if (!activeQueue || !activeQueue.includes(cb, cb.allowRecurse ? index + 1 : index)) {
        pendingQueue.push(cb);
      }
    } else {
      // if cb is an array, it is a component lifecycle hook which can only be
      // triggered by a job, which is already deduped in the main queue, so
      // we can skip duplicate check here to improve perf
      pendingQueue.push(...cb);
    }

    queueFlush();
  }

  function queuePreFlushCb(cb) {
    queueCb(cb, activePreFlushCbs, pendingPreFlushCbs, preFlushIndex);
  }

  function queuePostFlushCb(cb) {
    queueCb(cb, activePostFlushCbs, pendingPostFlushCbs, postFlushIndex);
  }

  function flushPreFlushCbs(seen, parentJob = null) {
    if (pendingPreFlushCbs.length) {
      currentPreFlushParentJob = parentJob;
      activePreFlushCbs = [...new Set(pendingPreFlushCbs)];
      pendingPreFlushCbs.length = 0;
      {
        seen = seen || new Map();
      }

      for (preFlushIndex = 0; preFlushIndex < activePreFlushCbs.length; preFlushIndex++) {
        if (checkRecursiveUpdates(seen, activePreFlushCbs[preFlushIndex])) {
          continue;
        }

        activePreFlushCbs[preFlushIndex]();
      }

      activePreFlushCbs = null;
      preFlushIndex = 0;
      currentPreFlushParentJob = null; // recursively flush until it drains

      flushPreFlushCbs(seen, parentJob);
    }
  }

  function flushPostFlushCbs(seen) {
    if (pendingPostFlushCbs.length) {
      var deduped = [...new Set(pendingPostFlushCbs)];
      pendingPostFlushCbs.length = 0; // #1947 already has active queue, nested flushPostFlushCbs call

      if (activePostFlushCbs) {
        activePostFlushCbs.push(...deduped);
        return;
      }

      activePostFlushCbs = deduped;
      {
        seen = seen || new Map();
      }
      activePostFlushCbs.sort((a, b) => getId(a) - getId(b));

      for (postFlushIndex = 0; postFlushIndex < activePostFlushCbs.length; postFlushIndex++) {
        if (checkRecursiveUpdates(seen, activePostFlushCbs[postFlushIndex])) {
          continue;
        }

        activePostFlushCbs[postFlushIndex]();
      }

      activePostFlushCbs = null;
      postFlushIndex = 0;
    }
  }

  var getId = job => job.id == null ? Infinity : job.id;

  function flushJobs(seen) {
    isFlushPending = false;
    isFlushing = true;
    {
      seen = seen || new Map();
    }
    flushPreFlushCbs(seen); // Sort queue before flush.
    // This ensures that:
    // 1. Components are updated from parent to child. (because parent is always
    //    created before the child so its render effect will have smaller
    //    priority number)
    // 2. If a component is unmounted during a parent component's update,
    //    its update can be skipped.

    queue.sort((a, b) => getId(a) - getId(b)); // conditional usage of checkRecursiveUpdate must be determined out of
    // try ... catch block since Rollup by default de-optimizes treeshaking
    // inside try-catch. This can leave all warning code unshaked. Although
    // they would get eventually shaken by a minifier like terser, some minifiers
    // would fail to do that (e.g. https://github.com/evanw/esbuild/issues/1610)

    var check = job => checkRecursiveUpdates(seen, job);

    try {
      for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
        var job = queue[flushIndex];

        if (job && job.active !== false) {
          if ("development" !== 'production' && check(job)) {
            continue;
          } // console.log(`running:`, job.id)


          callWithErrorHandling(job, null, 14
          /* SCHEDULER */
          );
        }
      }
    } finally {
      flushIndex = 0;
      queue.length = 0;
      flushPostFlushCbs(seen);
      isFlushing = false;
      currentFlushPromise = null; // some postFlushCb queued jobs!
      // keep flushing until it drains.

      if (queue.length || pendingPreFlushCbs.length || pendingPostFlushCbs.length) {
        flushJobs(seen);
      }
    }
  }

  function checkRecursiveUpdates(seen, fn) {
    if (!seen.has(fn)) {
      seen.set(fn, 1);
    } else {
      var count = seen.get(fn);

      if (count > RECURSION_LIMIT) {
        var instance = fn.ownerInstance;
        var componentName = instance && getComponentName(instance.type);
        warn$1("Maximum recursive updates exceeded".concat(componentName ? " in component <".concat(componentName, ">") : "", ". ") + "This means you have a reactive effect that is mutating its own " + "dependencies and thus recursively triggering itself. Possible sources " + "include component template, render function, updated hook or " + "watcher source function.");
        return true;
      } else {
        seen.set(fn, count + 1);
      }
    }
  } // Simple effect.


  function watchEffect(effect, options) {
    return doWatch(effect, null, options);
  }

  function watchPostEffect(effect, options) {
    return doWatch(effect, null, Object.assign(options || {}, {
      flush: 'post'
    }));
  }

  function watchSyncEffect(effect, options) {
    return doWatch(effect, null, Object.assign(options || {}, {
      flush: 'sync'
    }));
  } // initial value for watchers to trigger on undefined initial values


  var INITIAL_WATCHER_VALUE = {}; // implementation

  function watch(source, cb, options) {
    if (!isFunction(cb)) {
      warn$1("`watch(fn, options?)` signature has been moved to a separate API. " + "Use `watchEffect(fn, options?)` instead. `watch` now only " + "supports `watch(source, cb, options?) signature.");
    }

    return doWatch(source, cb, options);
  }

  function doWatch(source, cb, {
    immediate,
    deep,
    flush,
    onTrack,
    onTrigger
  } = EMPTY_OBJ) {
    if (!cb) {
      if (immediate !== undefined) {
        warn$1("watch() \"immediate\" option is only respected when using the " + "watch(source, callback, options?) signature.");
      }

      if (deep !== undefined) {
        warn$1("watch() \"deep\" option is only respected when using the " + "watch(source, callback, options?) signature.");
      }
    }

    var warnInvalidSource = s => {
      warn$1("Invalid watch source: ", s, "A watch source can only be a getter/effect function, a ref, " + "a reactive object, or an array of these types.");
    };

    var instance = currentInstance;
    var getter;
    var forceTrigger = false;
    var isMultiSource = false;

    if (isRef(source)) {
      getter = () => source.value;

      forceTrigger = !!source._shallow;
    } else if (isReactive(source)) {
      getter = () => source;

      deep = true;
    } else if (isArray(source)) {
      isMultiSource = true;
      forceTrigger = source.some(isReactive);

      getter = () => source.map(s => {
        if (isRef(s)) {
          return s.value;
        } else if (isReactive(s)) {
          return traverse(s);
        } else if (isFunction(s)) {
          return callWithErrorHandling(s, instance, 2
          /* WATCH_GETTER */
          );
        } else {
          warnInvalidSource(s);
        }
      });
    } else if (isFunction(source)) {
      if (cb) {
        // getter with cb
        getter = () => callWithErrorHandling(source, instance, 2
        /* WATCH_GETTER */
        );
      } else {
        // no cb -> simple effect
        getter = () => {
          if (instance && instance.isUnmounted) {
            return;
          }

          if (cleanup) {
            cleanup();
          }

          return callWithAsyncErrorHandling(source, instance, 3
          /* WATCH_CALLBACK */
          , [onInvalidate]);
        };
      }
    } else {
      getter = NOOP;
      warnInvalidSource(source);
    }

    if (cb && deep) {
      var baseGetter = getter;

      getter = () => traverse(baseGetter());
    }

    var cleanup;

    var onInvalidate = fn => {
      cleanup = effect.onStop = () => {
        callWithErrorHandling(fn, instance, 4
        /* WATCH_CLEANUP */
        );
      };
    }; // in SSR there is no need to setup an actual effect, and it should be noop
    // unless it's eager


    if (isInSSRComponentSetup) {
      // we will also not call the invalidate callback (+ runner is not set up)
      onInvalidate = NOOP;

      if (!cb) {
        getter();
      } else if (immediate) {
        callWithAsyncErrorHandling(cb, instance, 3
        /* WATCH_CALLBACK */
        , [getter(), isMultiSource ? [] : undefined, onInvalidate]);
      }

      return NOOP;
    }

    var oldValue = isMultiSource ? [] : INITIAL_WATCHER_VALUE;

    var job = () => {
      if (!effect.active) {
        return;
      }

      if (cb) {
        // watch(source, cb)
        var newValue = effect.run();

        if (deep || forceTrigger || (isMultiSource ? newValue.some((v, i) => hasChanged(v, oldValue[i])) : hasChanged(newValue, oldValue)) || false) {
          // cleanup before running cb again
          if (cleanup) {
            cleanup();
          }

          callWithAsyncErrorHandling(cb, instance, 3
          /* WATCH_CALLBACK */
          , [newValue, // pass undefined as the old value when it's changed for the first time
          oldValue === INITIAL_WATCHER_VALUE ? undefined : oldValue, onInvalidate]);
          oldValue = newValue;
        }
      } else {
        // watchEffect
        effect.run();
      }
    }; // important: mark the job as a watcher callback so that scheduler knows
    // it is allowed to self-trigger (#1727)


    job.allowRecurse = !!cb;
    var scheduler;

    if (flush === 'sync') {
      scheduler = job; // the scheduler function gets called directly
    } else if (flush === 'post') {
      scheduler = () => queuePostRenderEffect(job, instance && instance.suspense);
    } else {
      // default: 'pre'
      scheduler = () => {
        if (!instance || instance.isMounted) {
          queuePreFlushCb(job);
        } else {
          // with 'pre' option, the first call must happen before
          // the component is mounted so it is called synchronously.
          job();
        }
      };
    }

    var effect = new ReactiveEffect(getter, scheduler);
    {
      effect.onTrack = onTrack;
      effect.onTrigger = onTrigger;
    } // initial run

    if (cb) {
      if (immediate) {
        job();
      } else {
        oldValue = effect.run();
      }
    } else if (flush === 'post') {
      queuePostRenderEffect(effect.run.bind(effect), instance && instance.suspense);
    } else {
      effect.run();
    }

    return () => {
      effect.stop();

      if (instance && instance.scope) {
        remove(instance.scope.effects, effect);
      }
    };
  } // this.$watch


  function instanceWatch(source, value, options) {
    var publicThis = this.proxy;
    var getter = isString(source) ? source.includes('.') ? createPathGetter(publicThis, source) : () => publicThis[source] : source.bind(publicThis, publicThis);
    var cb;

    if (isFunction(value)) {
      cb = value;
    } else {
      cb = value.handler;
      options = value;
    }

    var cur = currentInstance;
    setCurrentInstance(this);
    var res = doWatch(getter, cb.bind(publicThis), options);

    if (cur) {
      setCurrentInstance(cur);
    } else {
      unsetCurrentInstance();
    }

    return res;
  }

  function createPathGetter(ctx, path) {
    var segments = path.split('.');
    return () => {
      var cur = ctx;

      for (var i = 0; i < segments.length && cur; i++) {
        cur = cur[segments[i]];
      }

      return cur;
    };
  }

  function traverse(value, seen) {
    if (!isObject(value) || value["__v_skip"
    /* SKIP */
    ]) {
      return value;
    }

    seen = seen || new Set();

    if (seen.has(value)) {
      return value;
    }

    seen.add(value);

    if (isRef(value)) {
      traverse(value.value, seen);
    } else if (isArray(value)) {
      for (var i = 0; i < value.length; i++) {
        traverse(value[i], seen);
      }
    } else if (isSet(value) || isMap(value)) {
      value.forEach(v => {
        traverse(v, seen);
      });
    } else if (isPlainObject(value)) {
      for (var key in value) {
        traverse(value[key], seen);
      }
    }

    return value;
  } // dev only


  var warnRuntimeUsage = method => warn$1("".concat(method, "() is a compiler-hint helper that is only usable inside ") + "<script setup> of a single file component. Its arguments should be " + "compiled away and passing it at runtime has no effect."); // implementation


  function defineProps() {
    {
      warnRuntimeUsage("defineProps");
    }
    return null;
  } // implementation


  function defineEmits() {
    {
      warnRuntimeUsage("defineEmits");
    }
    return null;
  }
  /**
   * Vue `<script setup>` compiler macro for declaring a component's exposed
   * instance properties when it is accessed by a parent component via template
   * refs.
   *
   * `<script setup>` components are closed by default - i.e. varaibles inside
   * the `<script setup>` scope is not exposed to parent unless explicitly exposed
   * via `defineExpose`.
   *
   * This is only usable inside `<script setup>`, is compiled away in the
   * output and should **not** be actually called at runtime.
   */


  function defineExpose(exposed) {
    {
      warnRuntimeUsage("defineExpose");
    }
  }
  /**
   * Vue `<script setup>` compiler macro for providing props default values when
   * using type-based `defineProps` declaration.
   *
   * Example usage:
   * ```ts
   * withDefaults(defineProps<{
   *   size?: number
   *   labels?: string[]
   * }>(), {
   *   size: 3,
   *   labels: () => ['default label']
   * })
   * ```
   *
   * This is only usable inside `<script setup>`, is compiled away in the output
   * and should **not** be actually called at runtime.
   */


  function withDefaults(props, defaults) {
    {
      warnRuntimeUsage("withDefaults");
    }
    return null;
  }

  function useSlots() {
    return getContext().slots;
  }

  function useAttrs() {
    return getContext().attrs;
  }

  function getContext() {
    var i = getCurrentInstance();

    if (!i) {
      warn$1("useContext() called without active instance.");
    }

    return i.setupContext || (i.setupContext = createSetupContext(i));
  }
  /**
   * Runtime helper for merging default declarations. Imported by compiled code
   * only.
   * @internal
   */


  function mergeDefaults(raw, defaults) {
    var props = isArray(raw) ? raw.reduce((normalized, p) => (normalized[p] = {}, normalized), {}) : raw;

    for (var key in defaults) {
      var opt = props[key];

      if (opt) {
        if (isArray(opt) || isFunction(opt)) {
          props[key] = {
            type: opt,
            default: defaults[key]
          };
        } else {
          opt.default = defaults[key];
        }
      } else if (opt === null) {
        props[key] = {
          default: defaults[key]
        };
      } else {
        warn$1("props default key \"".concat(key, "\" has no corresponding declaration."));
      }
    }

    return props;
  }
  /**
   * Used to create a proxy for the rest element when destructuring props with
   * defineProps().
   * @internal
   */


  function createPropsRestProxy(props, excludedKeys) {
    var ret = {};

    var _loop4 = function (key) {
      if (!excludedKeys.includes(key)) {
        Object.defineProperty(ret, key, {
          enumerable: true,
          get: () => props[key]
        });
      }
    };

    for (var key in props) {
      _loop4(key);
    }

    return ret;
  }
  /**
   * `<script setup>` helper for persisting the current instance context over
   * async/await flows.
   *
   * `@vue/compiler-sfc` converts the following:
   *
   * ```ts
   * const x = await foo()
   * ```
   *
   * into:
   *
   * ```ts
   * let __temp, __restore
   * const x = (([__temp, __restore] = withAsyncContext(() => foo())),__temp=await __temp,__restore(),__temp)
   * ```
   * @internal
   */


  function withAsyncContext(getAwaitable) {
    var ctx = getCurrentInstance();

    if (!ctx) {
      warn$1("withAsyncContext called without active current instance. " + "This is likely a bug.");
    }

    var awaitable = getAwaitable();
    unsetCurrentInstance();

    if (isPromise(awaitable)) {
      awaitable = awaitable.catch(e => {
        setCurrentInstance(ctx);
        throw e;
      });
    }

    return [awaitable, () => setCurrentInstance(ctx)];
  } // Actual implementation


  function h(type, propsOrChildren, children) {
    var l = arguments.length;

    if (l === 2) {
      if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
        // single vnode without props
        if (isVNode(propsOrChildren)) {
          return createVNode(type, null, [propsOrChildren]);
        } // props without children


        return createVNode(type, propsOrChildren);
      } else {
        // omit props
        return createVNode(type, null, propsOrChildren);
      }
    } else {
      if (l > 3) {
        children = Array.prototype.slice.call(arguments, 2);
      } else if (l === 3 && isVNode(children)) {
        children = [children];
      }

      return createVNode(type, propsOrChildren, children);
    }
  }

  var ssrContextKey = Symbol("ssrContext");

  var useSSRContext = () => {
    {
      var ctx = inject(ssrContextKey);

      if (!ctx) {
        warn$1("Server rendering context not provided. Make sure to only call " + "useSSRContext() conditionally in the server build.");
      }

      return ctx;
    }
  };

  function initCustomFormatter() {
    /* eslint-disable no-restricted-globals */
    if (typeof window === 'undefined') {
      return;
    }

    var vueStyle = {
      style: 'color:#3ba776'
    };
    var numberStyle = {
      style: 'color:#0b1bc9'
    };
    var stringStyle = {
      style: 'color:#b62e24'
    };
    var keywordStyle = {
      style: 'color:#9d288c'
    }; // custom formatter for Chrome
    // https://www.mattzeunert.com/2016/02/19/custom-chrome-devtools-object-formatters.html

    var formatter = {
      header(obj) {
        // TODO also format ComponentPublicInstance & ctx.slots/attrs in setup
        if (!isObject(obj)) {
          return null;
        }

        if (obj.__isVue) {
          return ['div', vueStyle, "VueInstance"];
        } else if (isRef(obj)) {
          return ['div', {}, ['span', vueStyle, genRefFlag(obj)], '<', formatValue(obj.value), ">"];
        } else if (isReactive(obj)) {
          return ['div', {}, ['span', vueStyle, 'Reactive'], '<', formatValue(obj), ">".concat(isReadonly(obj) ? " (readonly)" : "")];
        } else if (isReadonly(obj)) {
          return ['div', {}, ['span', vueStyle, 'Readonly'], '<', formatValue(obj), '>'];
        }

        return null;
      },

      hasBody(obj) {
        return obj && obj.__isVue;
      },

      body(obj) {
        if (obj && obj.__isVue) {
          return ['div', {}, ...formatInstance(obj.$)];
        }
      }

    };

    function formatInstance(instance) {
      var blocks = [];

      if (instance.type.props && instance.props) {
        blocks.push(createInstanceBlock('props', toRaw(instance.props)));
      }

      if (instance.setupState !== EMPTY_OBJ) {
        blocks.push(createInstanceBlock('setup', instance.setupState));
      }

      if (instance.data !== EMPTY_OBJ) {
        blocks.push(createInstanceBlock('data', toRaw(instance.data)));
      }

      var computed = extractKeys(instance, 'computed');

      if (computed) {
        blocks.push(createInstanceBlock('computed', computed));
      }

      var injected = extractKeys(instance, 'inject');

      if (injected) {
        blocks.push(createInstanceBlock('injected', injected));
      }

      blocks.push(['div', {}, ['span', {
        style: keywordStyle.style + ';opacity:0.66'
      }, '$ (internal): '], ['object', {
        object: instance
      }]]);
      return blocks;
    }

    function createInstanceBlock(type, target) {
      target = extend({}, target);

      if (!Object.keys(target).length) {
        return ['span', {}];
      }

      return ['div', {
        style: 'line-height:1.25em;margin-bottom:0.6em'
      }, ['div', {
        style: 'color:#476582'
      }, type], ['div', {
        style: 'padding-left:1.25em'
      }, ...Object.keys(target).map(key => {
        return ['div', {}, ['span', keywordStyle, key + ': '], formatValue(target[key], false)];
      })]];
    }

    function formatValue(v, asRaw = true) {
      if (typeof v === 'number') {
        return ['span', numberStyle, v];
      } else if (typeof v === 'string') {
        return ['span', stringStyle, JSON.stringify(v)];
      } else if (typeof v === 'boolean') {
        return ['span', keywordStyle, v];
      } else if (isObject(v)) {
        return ['object', {
          object: asRaw ? toRaw(v) : v
        }];
      } else {
        return ['span', stringStyle, String(v)];
      }
    }

    function extractKeys(instance, type) {
      var Comp = instance.type;

      if (isFunction(Comp)) {
        return;
      }

      var extracted = {};

      for (var key in instance.ctx) {
        if (isKeyOfType(Comp, key, type)) {
          extracted[key] = instance.ctx[key];
        }
      }

      return extracted;
    }

    function isKeyOfType(Comp, key, type) {
      var opts = Comp[type];

      if (isArray(opts) && opts.includes(key) || isObject(opts) && key in opts) {
        return true;
      }

      if (Comp.extends && isKeyOfType(Comp.extends, key, type)) {
        return true;
      }

      if (Comp.mixins && Comp.mixins.some(m => isKeyOfType(m, key, type))) {
        return true;
      }
    }

    function genRefFlag(v) {
      if (v._shallow) {
        return "ShallowRef";
      }

      if (v.effect) {
        return "ComputedRef";
      }

      return "Ref";
    }

    if (window.devtoolsFormatters) {
      window.devtoolsFormatters.push(formatter);
    } else {
      window.devtoolsFormatters = [formatter];
    }
  }

  function withMemo(memo, render, cache, index) {
    var cached = cache[index];

    if (cached && isMemoSame(cached, memo)) {
      return cached;
    }

    var ret = render(); // shallow clone

    ret.memo = memo.slice();
    return cache[index] = ret;
  }

  function isMemoSame(cached, memo) {
    var prev = cached.memo;

    if (prev.length != memo.length) {
      return false;
    }

    for (var i = 0; i < prev.length; i++) {
      if (prev[i] !== memo[i]) {
        return false;
      }
    } // make sure to let parent block track it when returning cached


    if (isBlockTreeEnabled > 0 && currentBlock) {
      currentBlock.push(cached);
    }

    return true;
  } // Core API ------------------------------------------------------------------


  var version = "3.2.20";
  var _ssrUtils = {
    createComponentInstance,
    setupComponent,
    renderComponentRoot,
    setCurrentRenderingInstance,
    isVNode,
    normalizeVNode
  };
  /**
   * SSR utils for \@vue/server-renderer. Only exposed in cjs builds.
   * @internal
   */

  var ssrUtils = _ssrUtils;
  /**
   * @internal only exposed in compat builds
   */

  var resolveFilter = null;
  /**
   * @internal only exposed in compat builds.
   */

  var compatUtils = null;

  function createElement(tagName, container) {
    if (tagName === 'input') {
      return new UniInputElement(tagName, container);
    } else if (tagName === 'textarea') {
      return new UniTextAreaElement(tagName, container);
    }

    return new UniElement(tagName, container);
  }

  function createTextNode(text, container) {
    return new UniTextNode(text, container);
  }

  function createComment(text, container) {
    return new UniCommentNode(text, container);
  }

  var tempContainer;
  var nodeOps = {
    insert: (child, parent, anchor) => {
      parent.insertBefore(child, anchor || null);
    },
    remove: child => {
      var parent = child.parentNode;

      if (parent) {
        parent.removeChild(child);
      }
    },
    createElement: (tag, container) => {
      return createElement(tag, container);
    },
    createText: (text, container) => createTextNode(text, container),
    createComment: (text, container) => createComment(text, container),
    setText: (node, text) => {
      node.nodeValue = text;
    },
    setElementText: (el, text) => {
      el.textContent = text;
    },
    parentNode: node => node.parentNode,
    nextSibling: node => node.nextSibling,

    // querySelector: selector => doc.querySelector(selector),
    setScopeId(el, id) {
      el.setAttribute(id, '');
    },

    cloneNode(el) {
      var cloned = el.cloneNode(true); // #3072
      // - in `patchDOMProp`, we store the actual value in the `el._value` property.
      // - normally, elements using `:value` bindings will not be hoisted, but if
      //   the bound value is a constant, e.g. `:value="true"` - they do get
      //   hoisted.
      // - in production, hoisted nodes are cloned when subsequent inserts, but
      //   cloneNode() does not copy the custom property we attached.
      // - This may need to account for other custom DOM properties we attach to
      //   elements in addition to `_value` in the future.

      if ("_value" in el) {
        cloned._value = el._value;
      }

      return cloned;
    },

    // __UNSAFE__
    // Reason: innerHTML.
    // Static content here can only come from compiled templates.
    // As long as the user only uses trusted templates, this is safe.
    insertStaticContent(content, parent, anchor) {
      var temp = tempContainer || (tempContainer = createElement('div'));
      temp.innerHTML = content;
      var first = temp.firstChild;
      var node = first;
      var last = node;

      while (node) {
        last = node;
        nodeOps.insert(node, parent, anchor);
        node = temp.firstChild;
      }

      return [first, last];
    }

  }; // compiler should normalize class + :class bindings on the same element
  // into a single binding ['staticClass', dynamic]

  function patchClass(el, value) {
    if (value == null) {
      value = '';
    }

    el.setAttribute('class', value);
  }

  function patchStyle(el, prev, next) {
    if (!next) {
      el.removeAttribute('style');
    } else if (isString(next)) {
      if (prev !== next) {
        el.setAttribute('style', next);
      }
    } else {
      var batchedStyles = {};
      var isPrevObj = prev && !isString(prev);

      if (isPrevObj) {
        for (var key in prev) {
          if (next[key] == null) {
            batchedStyles[key] = '';
          }
        }

        for (var _key10 in next) {
          var value = next[_key10];

          if (value !== prev[_key10]) {
            batchedStyles[_key10] = value;
          }
        }
      } else {
        for (var _key11 in next) {
          batchedStyles[_key11] = next[_key11];
        }
      }

      if (Object.keys(batchedStyles).length) {
        el.setAttribute('style', batchedStyles);
      }
    }
  }

  function patchAttr(el, key, value) {
    if (value == null) {
      el.removeAttribute(key);
    } else {
      el.setAttribute(key, value);
    }
  }

  function addEventListener(el, event, handler, options) {
    el.addEventListener(event, handler, options);
  }

  function removeEventListener(el, event, handler, options) {
    el.removeEventListener(event, handler, options);
  }

  function patchEvent(el, rawName, prevValue, nextValue, instance = null) {
    // vei = vue event invokers
    var invokers = el._vei || (el._vei = {});
    var existingInvoker = invokers[rawName];

    if (nextValue && existingInvoker) {
      // patch
      existingInvoker.value = nextValue;
    } else {
      var [name, options] = parseName(rawName);

      if (nextValue) {
        // add
        var invoker = invokers[rawName] = createInvoker(nextValue, instance);
        addEventListener(el, name, invoker, options);
      } else if (existingInvoker) {
        // remove
        removeEventListener(el, name, existingInvoker, options);
        invokers[rawName] = undefined;
      }
    }
  }

  var optionsModifierRE = /(?:Once|Passive|Capture)$/;

  function parseName(name) {
    var options;

    if (optionsModifierRE.test(name)) {
      options = {};
      var m;

      while (m = name.match(optionsModifierRE)) {
        name = name.slice(0, name.length - m[0].length);
        options[m[0].toLowerCase()] = true;
      }
    }

    return [hyphenate(name.slice(2)), options];
  }

  function createInvoker(initialValue, instance) {
    var invoker = e => {
      callWithAsyncErrorHandling(invoker.value, instance, 5
      /* NATIVE_EVENT_HANDLER */
      , [e]);
    };

    invoker.value = initialValue;
    var modifiers = new Set(); // 合并 modifiers

    if (isArray(invoker.value)) {
      invoker.value.forEach(v => {
        if (v.modifiers) {
          v.modifiers.forEach(m => {
            modifiers.add(m);
          });
        }
      });
    } else {
      if (invoker.value.modifiers) {
        invoker.value.modifiers.forEach(m => {
          modifiers.add(m);
        });
      }

      initWxsEvent(invoker, instance);
    }

    invoker.modifiers = [...modifiers];
    return invoker;
  }

  function initWxsEvent(invoker, instance) {
    if (!instance) {
      return;
    }

    var {
      $wxsModules
    } = instance;

    if (!$wxsModules) {
      return;
    }

    var invokerSourceCode = invoker.value.toString();

    if (!$wxsModules.find(module => invokerSourceCode.indexOf('.' + module + '.') > -1)) {
      return;
    }

    invoker.wxsEvent = invoker.value();
  }

  var forcePatchProps = {
    AD: ['data'],
    'AD-DRAW': ['data'],
    'LIVE-PLAYER': ['picture-in-picture-mode'],
    MAP: ['markers', 'polyline', 'circles', 'controls', 'include-points', 'polygons'],
    PICKER: ['range', 'value'],
    'PICKER-VIEW': ['value'],
    'RICH-TEXT': ['nodes'],
    VIDEO: ['danmu-list', 'header'],
    'WEB-VIEW': ['webview-styles']
  };
  var forcePatchPropKeys = ['animation'];

  var forcePatchProp = (_, key) => {
    if (forcePatchPropKeys.indexOf(key) > -1) {
      return true;
    }

    var keys = forcePatchProps[_.nodeName];

    if (keys && keys.indexOf(key) > -1) {
      return true;
    }

    return false;
  };

  var patchProp = (el, key, prevValue, nextValue, isSVG = false, prevChildren, parentComponent, parentSuspense, unmountChildren) => {
    switch (key) {
      // special
      case 'class':
        patchClass(el, nextValue);
        break;

      case 'style':
        patchStyle(el, prevValue, nextValue);
        break;

      default:
        if (isOn(key)) {
          // ignore v-model listeners
          if (!isModelListener(key)) {
            patchEvent(el, key, prevValue, nextValue, parentComponent);
          }
        } else {
          // 非基本类型
          if (isObject(nextValue)) {
            var equal = prevValue === nextValue; // 可触发收集响应式数据的最新依赖

            nextValue = JSON_PROTOCOL + JSON.stringify(nextValue);

            if (equal && el.getAttribute(key) === nextValue) {
              return;
            }
          } else if (prevValue === nextValue) {
            // 基本类型
            return;
          }

          patchAttr(el, key, nextValue);
        }

        break;
    }
  };

  function useCssModule(name = '$style') {
    /* istanbul ignore else */
    {
      var instance = getCurrentInstance();

      if (!instance) {
        warn$1("useCssModule must be called inside setup()");
        return EMPTY_OBJ;
      }

      var modules = instance.type.__cssModules;

      if (!modules) {
        warn$1("Current instance does not have CSS modules injected.");
        return EMPTY_OBJ;
      }

      var mod = modules[name];

      if (!mod) {
        warn$1("Current instance does not have CSS module named \"".concat(name, "\"."));
        return EMPTY_OBJ;
      }

      return mod;
    }
  }
  /**
   * Runtime helper for SFC's CSS variable injection feature.
   * @private
   */


  function useCssVars(getter) {
    var instance = getCurrentInstance();
    /* istanbul ignore next */

    if (!instance) {
      warn$1("useCssVars is called without current active component instance.");
      return;
    }

    var setVars = () => setVarsOnVNode(instance.subTree, getter(instance.proxy));

    onMounted(() => watchEffect(setVars, {
      flush: 'post'
    }));
    onUpdated(setVars);
  }

  function setVarsOnVNode(vnode, vars) {
    if (vnode.shapeFlag & 128
    /* SUSPENSE */
    ) {
      var suspense = vnode.suspense;
      vnode = suspense.activeBranch;

      if (suspense.pendingBranch && !suspense.isHydrating) {
        suspense.effects.push(() => {
          setVarsOnVNode(suspense.activeBranch, vars);
        });
      }
    } // drill down HOCs until it's a non-component vnode


    while (vnode.component) {
      vnode = vnode.component.subTree;
    }

    if (vnode.shapeFlag & 1
    /* ELEMENT */
    && vnode.el) {
      var style = vnode.el.style;

      for (var key in vars) {
        style.setProperty("--".concat(key), vars[key]);
      }
    } else if (vnode.type === Fragment) {
      vnode.children.forEach(c => setVarsOnVNode(c, vars));
    }
  }

  var TRANSITION = 'transition';
  var ANIMATION = 'animation'; // DOM Transition is a higher-order-component based on the platform-agnostic
  // base Transition component, with DOM-specific logic.

  var Transition = (props, {
    slots
  }) => h(BaseTransition, resolveTransitionProps(props), slots);

  Transition.displayName = 'Transition';
  var DOMTransitionPropsValidators = {
    name: String,
    type: String,
    css: {
      type: Boolean,
      default: true
    },
    duration: [String, Number, Object],
    enterFromClass: String,
    enterActiveClass: String,
    enterToClass: String,
    appearFromClass: String,
    appearActiveClass: String,
    appearToClass: String,
    leaveFromClass: String,
    leaveActiveClass: String,
    leaveToClass: String
  };
  var TransitionPropsValidators = Transition.props = /*#__PURE__*/extend({}, BaseTransition.props, DOMTransitionPropsValidators);
  /**
   * #3227 Incoming hooks may be merged into arrays when wrapping Transition
   * with custom HOCs.
   */

  var callHook$1 = (hook, args = []) => {
    if (isArray(hook)) {
      hook.forEach(h => h(...args));
    } else if (hook) {
      hook(...args);
    }
  };
  /**
   * Check if a hook expects a callback (2nd arg), which means the user
   * intends to explicitly control the end of the transition.
   */


  var hasExplicitCallback = hook => {
    return hook ? isArray(hook) ? hook.some(h => h.length > 1) : hook.length > 1 : false;
  };

  function resolveTransitionProps(rawProps) {
    var baseProps = {};

    for (var key in rawProps) {
      if (!(key in DOMTransitionPropsValidators)) {
        baseProps[key] = rawProps[key];
      }
    }

    if (rawProps.css === false) {
      return baseProps;
    }

    var {
      name = 'v',
      type,
      duration,
      enterFromClass = "".concat(name, "-enter-from"),
      enterActiveClass = "".concat(name, "-enter-active"),
      enterToClass = "".concat(name, "-enter-to"),
      appearFromClass = enterFromClass,
      appearActiveClass = enterActiveClass,
      appearToClass = enterToClass,
      leaveFromClass = "".concat(name, "-leave-from"),
      leaveActiveClass = "".concat(name, "-leave-active"),
      leaveToClass = "".concat(name, "-leave-to")
    } = rawProps;
    var durations = normalizeDuration(duration);
    var enterDuration = durations && durations[0];
    var leaveDuration = durations && durations[1];
    var {
      onBeforeEnter,
      onEnter,
      onEnterCancelled,
      onLeave,
      onLeaveCancelled,
      onBeforeAppear = onBeforeEnter,
      onAppear = onEnter,
      onAppearCancelled = onEnterCancelled
    } = baseProps;

    var finishEnter = (el, isAppear, done) => {
      removeTransitionClass(el, isAppear ? appearToClass : enterToClass);
      removeTransitionClass(el, isAppear ? appearActiveClass : enterActiveClass);
      done && done();
    };

    var finishLeave = (el, done) => {
      removeTransitionClass(el, leaveToClass);
      removeTransitionClass(el, leaveActiveClass);
      done && done();
    };

    var makeEnterHook = isAppear => {
      return (el, done) => {
        var hook = isAppear ? onAppear : onEnter;

        var resolve = () => finishEnter(el, isAppear, done);

        callHook$1(hook, [el, resolve]);
        nextFrame(() => {
          removeTransitionClass(el, isAppear ? appearFromClass : enterFromClass);
          addTransitionClass(el, isAppear ? appearToClass : enterToClass);

          if (!hasExplicitCallback(hook)) {
            whenTransitionEnds(el, type, enterDuration, resolve);
          }
        });
      };
    };

    return extend(baseProps, {
      onBeforeEnter(el) {
        callHook$1(onBeforeEnter, [el]);
        addTransitionClass(el, enterFromClass);
        addTransitionClass(el, enterActiveClass);
      },

      onBeforeAppear(el) {
        callHook$1(onBeforeAppear, [el]);
        addTransitionClass(el, appearFromClass);
        addTransitionClass(el, appearActiveClass);
      },

      onEnter: makeEnterHook(false),
      onAppear: makeEnterHook(true),

      onLeave(el, done) {
        var resolve = () => finishLeave(el, done);

        addTransitionClass(el, leaveFromClass); // force reflow so *-leave-from classes immediately take effect (#2593)

        forceReflow();
        addTransitionClass(el, leaveActiveClass);
        nextFrame(() => {
          removeTransitionClass(el, leaveFromClass);
          addTransitionClass(el, leaveToClass);

          if (!hasExplicitCallback(onLeave)) {
            whenTransitionEnds(el, type, leaveDuration, resolve);
          }
        });
        callHook$1(onLeave, [el, resolve]);
      },

      onEnterCancelled(el) {
        finishEnter(el, false);
        callHook$1(onEnterCancelled, [el]);
      },

      onAppearCancelled(el) {
        finishEnter(el, true);
        callHook$1(onAppearCancelled, [el]);
      },

      onLeaveCancelled(el) {
        finishLeave(el);
        callHook$1(onLeaveCancelled, [el]);
      }

    });
  }

  function normalizeDuration(duration) {
    if (duration == null) {
      return null;
    } else if (isObject(duration)) {
      return [NumberOf(duration.enter), NumberOf(duration.leave)];
    } else {
      var n = NumberOf(duration);
      return [n, n];
    }
  }

  function NumberOf(val) {
    var res = toNumber(val);
    validateDuration(res);
    return res;
  }

  function validateDuration(val) {
    if (typeof val !== 'number') {
      warn$1("<transition> explicit duration is not a valid number - " + "got ".concat(JSON.stringify(val), "."));
    } else if (isNaN(val)) {
      warn$1("<transition> explicit duration is NaN - " + 'the duration expression might be incorrect.');
    }
  }

  function addTransitionClass(el, cls) {
    cls.split(/\s+/).forEach(c => c && el.classList.add(c));
    (el._vtc || (el._vtc = new Set())).add(cls);
  }

  function removeTransitionClass(el, cls) {
    cls.split(/\s+/).forEach(c => c && el.classList.remove(c));
    var {
      _vtc
    } = el;

    if (_vtc) {
      _vtc.delete(cls);

      if (!_vtc.size) {
        el._vtc = undefined;
      }
    }
  }

  function nextFrame(cb) {
    requestAnimationFrame(() => {
      requestAnimationFrame(cb);
    });
  }

  var endId = 0;

  function whenTransitionEnds(el, expectedType, explicitTimeout, resolve) {
    var id = el._endId = ++endId;

    var resolveIfNotStale = () => {
      if (id === el._endId) {
        resolve();
      }
    };

    if (explicitTimeout) {
      return setTimeout(resolveIfNotStale, explicitTimeout);
    }

    var {
      type,
      timeout,
      propCount
    } = getTransitionInfo(el, expectedType);

    if (!type) {
      return resolve();
    }

    var endEvent = type + 'end';
    var ended = 0;

    var end = () => {
      el.removeEventListener(endEvent, onEnd);
      resolveIfNotStale();
    };

    var onEnd = e => {
      if (e.target === el && ++ended >= propCount) {
        end();
      }
    };

    setTimeout(() => {
      if (ended < propCount) {
        end();
      }
    }, timeout + 1);
    el.addEventListener(endEvent, onEnd);
  }

  function getTransitionInfo(el, expectedType) {
    var styles = window.getComputedStyle(el); // JSDOM may return undefined for transition properties

    var getStyleProperties = key => (styles[key] || '').split(', ');

    var transitionDelays = getStyleProperties(TRANSITION + 'Delay');
    var transitionDurations = getStyleProperties(TRANSITION + 'Duration');
    var transitionTimeout = getTimeout(transitionDelays, transitionDurations);
    var animationDelays = getStyleProperties(ANIMATION + 'Delay');
    var animationDurations = getStyleProperties(ANIMATION + 'Duration');
    var animationTimeout = getTimeout(animationDelays, animationDurations);
    var type = null;
    var timeout = 0;
    var propCount = 0;
    /* istanbul ignore if */

    if (expectedType === TRANSITION) {
      if (transitionTimeout > 0) {
        type = TRANSITION;
        timeout = transitionTimeout;
        propCount = transitionDurations.length;
      }
    } else if (expectedType === ANIMATION) {
      if (animationTimeout > 0) {
        type = ANIMATION;
        timeout = animationTimeout;
        propCount = animationDurations.length;
      }
    } else {
      timeout = Math.max(transitionTimeout, animationTimeout);
      type = timeout > 0 ? transitionTimeout > animationTimeout ? TRANSITION : ANIMATION : null;
      propCount = type ? type === TRANSITION ? transitionDurations.length : animationDurations.length : 0;
    }

    var hasTransform = type === TRANSITION && /\b(transform|all)(,|$)/.test(styles[TRANSITION + 'Property']);
    return {
      type,
      timeout,
      propCount,
      hasTransform
    };
  }

  function getTimeout(delays, durations) {
    while (delays.length < durations.length) {
      delays = delays.concat(delays);
    }

    return Math.max(...durations.map((d, i) => toMs(d) + toMs(delays[i])));
  } // Old versions of Chromium (below 61.0.3163.100) formats floating pointer
  // numbers in a locale-dependent way, using a comma instead of a dot.
  // If comma is not replaced with a dot, the input will be rounded down
  // (i.e. acting as a floor function) causing unexpected behaviors


  function toMs(s) {
    return Number(s.slice(0, -1).replace(',', '.')) * 1000;
  } // synchronously force layout to put elements into a certain state


  function forceReflow() {
    return document.body.offsetHeight;
  }

  var positionMap = new WeakMap();
  var newPositionMap = new WeakMap();
  var TransitionGroupImpl = {
    name: 'TransitionGroup',
    props: /*#__PURE__*/extend({}, TransitionPropsValidators, {
      tag: String,
      moveClass: String
    }),

    setup(props, {
      slots
    }) {
      var instance = getCurrentInstance();
      var state = useTransitionState();
      var prevChildren;
      var children;
      onUpdated(() => {
        // children is guaranteed to exist after initial render
        if (!prevChildren.length) {
          return;
        }

        var moveClass = props.moveClass || "".concat(props.name || 'v', "-move");

        if (!hasCSSTransform(prevChildren[0].el, instance.vnode.el, moveClass)) {
          return;
        } // we divide the work into three loops to avoid mixing DOM reads and writes
        // in each iteration - which helps prevent layout thrashing.


        prevChildren.forEach(callPendingCbs);
        prevChildren.forEach(recordPosition);
        var movedChildren = prevChildren.filter(applyTranslation); // force reflow to put everything in position

        forceReflow();
        movedChildren.forEach(c => {
          var el = c.el;
          var style = el.style;
          addTransitionClass(el, moveClass);
          style.transform = style.webkitTransform = style.transitionDuration = '';

          var cb = el._moveCb = e => {
            if (e && e.target !== el) {
              return;
            }

            if (!e || /transform$/.test(e.propertyName)) {
              el.removeEventListener('transitionend', cb);
              el._moveCb = null;
              removeTransitionClass(el, moveClass);
            }
          };

          el.addEventListener('transitionend', cb);
        });
      });
      return () => {
        var rawProps = toRaw(props);
        var cssTransitionProps = resolveTransitionProps(rawProps);
        var tag = rawProps.tag || Fragment;
        prevChildren = children;
        children = slots.default ? getTransitionRawChildren(slots.default()) : [];

        for (var i = 0; i < children.length; i++) {
          var child = children[i];

          if (child.key != null) {
            setTransitionHooks(child, resolveTransitionHooks(child, cssTransitionProps, state, instance));
          } else {
            warn$1("<TransitionGroup> children must be keyed.");
          }
        }

        if (prevChildren) {
          for (var _i5 = 0; _i5 < prevChildren.length; _i5++) {
            var _child = prevChildren[_i5];
            setTransitionHooks(_child, resolveTransitionHooks(_child, cssTransitionProps, state, instance));
            positionMap.set(_child, _child.el.getBoundingClientRect());
          }
        }

        return createVNode(tag, null, children);
      };
    }

  };
  var TransitionGroup = TransitionGroupImpl;

  function callPendingCbs(c) {
    var el = c.el;

    if (el._moveCb) {
      el._moveCb();
    }

    if (el._enterCb) {
      el._enterCb();
    }
  }

  function recordPosition(c) {
    newPositionMap.set(c, c.el.getBoundingClientRect());
  }

  function applyTranslation(c) {
    var oldPos = positionMap.get(c);
    var newPos = newPositionMap.get(c);
    var dx = oldPos.left - newPos.left;
    var dy = oldPos.top - newPos.top;

    if (dx || dy) {
      var s = c.el.style;
      s.transform = s.webkitTransform = "translate(".concat(dx, "px,").concat(dy, "px)");
      s.transitionDuration = '0s';
      return c;
    }
  }

  function hasCSSTransform(el, root, moveClass) {
    // Detect whether an element with the move class applied has
    // CSS transitions. Since the element may be inside an entering
    // transition at this very moment, we make a clone of it and remove
    // all other transition classes applied to ensure only the move class
    // is applied.
    var clone = el.cloneNode();

    if (el._vtc) {
      el._vtc.forEach(cls => {
        cls.split(/\s+/).forEach(c => c && clone.classList.remove(c));
      });
    }

    moveClass.split(/\s+/).forEach(c => c && clone.classList.add(c));
    clone.style.display = 'none';
    var container = root.nodeType === 1 ? root : root.parentNode;
    container.appendChild(clone);
    var {
      hasTransform
    } = getTransitionInfo(clone);
    container.removeChild(clone);
    return hasTransform;
  }

  var getModelAssigner = vnode => {
    var fn = vnode.props['onUpdate:modelValue'];
    return isArray(fn) ? value => invokeArrayFns(fn, value) : fn;
  }; // We are exporting the v-model runtime directly as vnode hooks so that it can
  // be tree-shaken in case v-model is never used.


  var vModelText = {
    created(el, {
      value,
      modifiers: {
        trim,
        number
      }
    }, vnode) {
      el.value = value == null ? '' : value;
      el._assign = getModelAssigner(vnode);
      addEventListener(el, 'input', e => {
        var domValue = e.detail.value; // 从 view 层接收到新值后，赋值给 service 层元素，注意，需要临时解除 pageNode，否则赋值 value 会触发向 view 层的再次同步数据

        var pageNode = el.pageNode;
        el.pageNode = null;
        el.value = domValue;
        el.pageNode = pageNode;

        if (trim) {
          domValue = domValue.trim();
        } else if (number) {
          domValue = toNumber(domValue);
        }

        el._assign(domValue);
      });
    },

    beforeUpdate(el, {
      value
    }, vnode) {
      el._assign = getModelAssigner(vnode);
      var newValue = value == null ? '' : value;

      if (el.value !== newValue) {
        el.value = newValue;
      }
    }

  };
  var systemModifiers = ['ctrl', 'shift', 'alt', 'meta'];
  var modifierGuards = {
    stop: e => e.stopPropagation(),
    prevent: e => e.preventDefault(),
    self: e => e.target !== e.currentTarget,
    ctrl: e => !e.ctrlKey,
    shift: e => !e.shiftKey,
    alt: e => !e.altKey,
    meta: e => !e.metaKey,
    left: e => 'button' in e && e.button !== 0,
    middle: e => 'button' in e && e.button !== 1,
    right: e => 'button' in e && e.button !== 2,
    exact: (e, modifiers) => systemModifiers.some(m => e["".concat(m, "Key")] && !modifiers.includes(m))
  };
  /**
   * @private
   */

  var withModifiers = (fn, modifiers) => {
    // fixed by xxxxxx 补充 modifiers 标记，方便同步给 view 层
    var wrapper = (event, ...args) => {
      for (var i = 0; i < modifiers.length; i++) {
        var guard = modifierGuards[modifiers[i]];
        if (guard && guard(event, modifiers)) return;
      }

      return fn(event, ...args);
    };

    wrapper.modifiers = modifiers;
    return wrapper;
  }; // Kept for 2.x compat.
  // Note: IE11 compat for `spacebar` and `del` is removed for now.


  var keyNames = {
    esc: 'escape',
    space: ' ',
    up: 'arrow-up',
    left: 'arrow-left',
    right: 'arrow-right',
    down: 'arrow-down',
    delete: 'backspace'
  };
  /**
   * @private
   */

  var withKeys = (fn, modifiers) => {
    return event => {
      if (!('key' in event)) {
        return;
      }

      var eventKey = hyphenate(event.key);

      if (modifiers.some(k => k === eventKey || keyNames[k] === eventKey)) {
        return fn(event);
      }
    };
  };

  var vShow = {
    beforeMount(el, {
      value
    }) {
      setDisplay(el, value);
    },

    updated(el, {
      value,
      oldValue
    }) {
      if (!value === !oldValue) return;
      setDisplay(el, value);
    },

    beforeUnmount(el, {
      value
    }) {
      setDisplay(el, value);
    }

  };

  function setDisplay(el, value) {
    el.setAttribute('.vShow', !!value);
  }

  var rendererOptions = extend({
    patchProp,
    forcePatchProp
  }, nodeOps); // lazy create the renderer - this makes core renderer logic tree-shakable
  // in case the user only imports reactivity utilities from Vue.

  var renderer;

  function ensureRenderer() {
    return renderer || (renderer = createRenderer(rendererOptions));
  } // use explicit type casts here to avoid import() calls in rolled-up d.ts


  var render = (...args) => {
    ensureRenderer().render(...args);
  };

  var createApp = (...args) => {
    var app = ensureRenderer().createApp(...args);
    {
      injectNativeTagCheck(app);
    }
    var {
      mount
    } = app;

    app.mount = container => {
      if (isString(container)) {
        container = createComment(container);
      }

      return container && mount(container, false, false);
    };

    return app;
  };

  var createSSRApp = createApp;

  function injectNativeTagCheck(app) {
    // Inject `isNativeTag`
    // this is used for component name validation (dev only)
    Object.defineProperty(app.config, 'isNativeTag', {
      value: tag => isHTMLTag(tag) || isSVGTag(tag),
      writable: false
    });
  } // 在h5平台测试时，需要的mock


  function onBeforeActivate() {}

  function onBeforeDeactivate() {}

  var Vue = /*#__PURE__*/Object.freeze({
    __proto__: null,
    BaseTransition: BaseTransition,
    Comment: Comment,
    EffectScope: EffectScope,
    Fragment: Fragment,
    KeepAlive: KeepAlive,
    ReactiveEffect: ReactiveEffect,
    Static: Static,
    Suspense: Suspense,
    Teleport: Teleport,
    Text: Text,
    Transition: Transition,
    TransitionGroup: TransitionGroup,
    callWithAsyncErrorHandling: callWithAsyncErrorHandling,
    callWithErrorHandling: callWithErrorHandling,
    camelize: camelize,
    capitalize: capitalize,
    cloneVNode: cloneVNode,
    compatUtils: compatUtils,
    computed: computed,
    createApp: createApp,
    createBlock: createBlock,
    createComment: createComment,
    createCommentVNode: createCommentVNode,
    createElement: createElement,
    createElementBlock: createElementBlock,
    createElementVNode: createBaseVNode,
    createHydrationRenderer: createHydrationRenderer,
    createPropsRestProxy: createPropsRestProxy,
    createRenderer: createRenderer,
    createSSRApp: createSSRApp,
    createSlots: createSlots,
    createStaticVNode: createStaticVNode,
    createTextNode: createTextNode,
    createTextVNode: createTextVNode,
    createVNode: createVNode,
    createVueApp: createApp,
    customRef: customRef,
    defineAsyncComponent: defineAsyncComponent,
    defineComponent: defineComponent,
    defineEmits: defineEmits,
    defineExpose: defineExpose,
    defineProps: defineProps,

    get devtools() {
      return devtools;
    },

    effect: effect,
    effectScope: effectScope,
    getCurrentInstance: getCurrentInstance,
    getCurrentScope: getCurrentScope,
    getTransitionRawChildren: getTransitionRawChildren,
    guardReactiveProps: guardReactiveProps,
    h: h,
    handleError: handleError,
    initCustomFormatter: initCustomFormatter,
    inject: inject,
    injectHook: injectHook,

    get isInSSRComponentSetup() {
      return isInSSRComponentSetup;
    },

    isMemoSame: isMemoSame,
    isProxy: isProxy,
    isReactive: isReactive,
    isReadonly: isReadonly,
    isRef: isRef,
    isRuntimeOnly: isRuntimeOnly,
    isVNode: isVNode,
    markRaw: markRaw,
    mergeDefaults: mergeDefaults,
    mergeProps: mergeProps,
    nextTick: nextTick,
    normalizeClass: normalizeClass,
    normalizeProps: normalizeProps,
    normalizeStyle: normalizeStyle,
    onActivated: onActivated,
    onBeforeActivate: onBeforeActivate,
    onBeforeDeactivate: onBeforeDeactivate,
    onBeforeMount: onBeforeMount,
    onBeforeUnmount: onBeforeUnmount,
    onBeforeUpdate: onBeforeUpdate,
    onDeactivated: onDeactivated,
    onErrorCaptured: onErrorCaptured,
    onMounted: onMounted,
    onRenderTracked: onRenderTracked,
    onRenderTriggered: onRenderTriggered,
    onScopeDispose: onScopeDispose,
    onServerPrefetch: onServerPrefetch,
    onUnmounted: onUnmounted,
    onUpdated: onUpdated,
    openBlock: openBlock,
    popScopeId: popScopeId,
    provide: provide,
    proxyRefs: proxyRefs,
    pushScopeId: pushScopeId,
    queuePostFlushCb: queuePostFlushCb,
    reactive: reactive,
    readonly: readonly,
    ref: ref,
    registerRuntimeCompiler: registerRuntimeCompiler,
    render: render,
    renderList: renderList,
    renderSlot: renderSlot,
    resolveComponent: resolveComponent,
    resolveDirective: resolveDirective,
    resolveDynamicComponent: resolveDynamicComponent,
    resolveFilter: resolveFilter,
    resolveTransitionHooks: resolveTransitionHooks,
    setBlockTracking: setBlockTracking,
    setDevtoolsHook: setDevtoolsHook,
    setTransitionHooks: setTransitionHooks,
    shallowReactive: shallowReactive,
    shallowReadonly: shallowReadonly,
    shallowRef: shallowRef,
    ssrContextKey: ssrContextKey,
    ssrUtils: ssrUtils,
    stop: stop,
    toDisplayString: toDisplayString,
    toHandlerKey: toHandlerKey,
    toHandlers: toHandlers,
    toRaw: toRaw,
    toRef: toRef,
    toRefs: toRefs,
    transformVNodeArgs: transformVNodeArgs,
    triggerRef: triggerRef,
    unref: unref,
    useAttrs: useAttrs,
    useCssModule: useCssModule,
    useCssVars: useCssVars,
    useSSRContext: useSSRContext,
    useSlots: useSlots,
    useTransitionState: useTransitionState,
    vModelText: vModelText,
    vShow: vShow,
    version: version,
    warn: warn$1,
    watch: watch,
    watchEffect: watchEffect,
    watchPostEffect: watchPostEffect,
    watchSyncEffect: watchSyncEffect,
    withAsyncContext: withAsyncContext,
    withCtx: withCtx,
    withDefaults: withDefaults,
    withDirectives: withDirectives,
    withKeys: withKeys,
    withMemo: withMemo,
    withModifiers: withModifiers,
    withScopeId: withScopeId
  });
  exports.Vue = Vue;
}