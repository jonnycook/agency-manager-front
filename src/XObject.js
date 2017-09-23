
import _ from 'lodash';
import { Component } from 'react';



import { ObjectID } from 'bson';

export class XComponent extends Component {
  constructor(opts = {}) {
    super();
    this.observing = [];

    if (opts.actions) {
      this.actions = {};
      for (let action of Object.keys(opts.actions)) {
        let func = opts.actions[action];

        this.actions[action] = (...args) => {
          if (args[1] instanceof Event) {
            return func.apply(this, args);
          }
          else {
            return (...a) => func.apply(this, args.concat(a));
          }
        };
      }
    }
  }

  render() {
    for (let {obj, prop, observer} of this.observing) {
      XObject.removeObserver(obj, prop, observer);
    }
    this.observing = [];
    return XObject.captureAccesses(() => {
      return this.xRender();
    }, (obj, prop) => {
      let observer = () => { console.log('forcing updating', obj, prop); this.forceUpdate(); }
      if (!this.observing.find(o => o.obj === obj && o.prop === prop)) {
        this.observing.push({obj, prop, observer});
        XObject.observe(obj, prop, observer);
      }
    });
  }

  componentWillUnmount() {
    for (let {obj, prop, observer} of this.observing) {
      XObject.removeObserver(obj, prop, observer);
    }
    this.observing = [];
  }
}



export function XObject(obj) {
  // var id = objId++;
  var propObservers = {};
  var observers = [];

  var onAccessUnsetKey;

  var proxy = new Proxy({}, {
    get(_, prop) {
      if (prop === XObject._observeSymbol) {
        return function(prop, observer) {
          if (prop) {
            if (!propObservers[prop]) propObservers[prop] = [];
            propObservers[prop].push(observer);
          }
          else {
            observers.push(observer);
          }
        }
      }
      else if (prop === XObject._removeObserverSymbol) {
        return function(prop, observer) {
          if (prop) {
            if (!propObservers[prop]) propObservers[prop] = [];
            propObservers[prop].splice(propObservers[prop].indexOf(observer), 1);            
          }
          else {
            observers.splice(observers.indexOf(observer), 1);            
          }
        }
      }
      else if (prop === XObject._typeSymbol) {
        return 'object';
      }
      else if (prop === XObject._contentsSymbol) {
        return obj;
      }

      if (!(prop in obj) && onAccessUnsetKey) {
        obj[prop] = onAccessUnsetKey();
        for (let observer of observers) {
          observer('set', prop, obj[prop]);
        }
        
        if (propObservers[prop]) {
          for (let observer of propObservers[prop]) {
            observer('set', obj[prop]);
          }
        }
      }

      if (prop.indexOf('.') != -1) {
        var p = prop.substr(0, prop.indexOf('.'));
        XObject.onAccess(proxy, p);
        return obj[p][prop.substr(prop.indexOf('.') + 1)];
      }

      if (prop !== '_id') {
        XObject.onAccess(proxy, prop);
      }

      return obj[prop];
    },
    set(_, prop, value) {
      if (prop === XObject._accessUnsetKeySymbol) {
        onAccessUnsetKey = value;
      }

      if (obj[prop] === value) return true;

      obj[prop] = value;

      for (let observer of observers) {
        observer('set', prop, value);
      }
      
      if (propObservers[prop]) {
        for (let observer of propObservers[prop]) {
          observer('set', value);
        }
      }

      return true;
    },
    ownKeys() {
      XObject.onAccess(proxy, null);
      return Object.keys(obj);
    },
    getOwnPropertyDescriptor(k) {
      return {
        enumerable: true,
        configurable: true,
      };
    },
    deleteProperty(_, prop) {
      delete obj[prop];
      for (let observer of observers) {
        observer('unset', prop);
      }
      
      if (propObservers[prop]) {
        for (let observer of propObservers[prop]) {
          observer('unset');
        }
      }

      return true;
    }
  });

  return proxy;
}

XObject.id = function() {
  return new ObjectID().toString();
}

XObject._contentsSymbol = Symbol('contents');
XObject._typeSymbol = Symbol('type');
XObject._observeSymbol = Symbol('observe');
XObject._removeObserverSymbol = Symbol('removeObserver');
XObject._arrayMapSymbol = Symbol('arrayMap');
XObject._accessUnsetKeySymbol = Symbol('accessUnsetKey');

XObject.observe = function(o, prop, observer) {
  o[XObject._observeSymbol](prop, observer);
}
XObject.removeObserver = function(o, prop, observer) {
  o[XObject._removeObserverSymbol](prop, observer);
}

XObject.isArray = function(obj) {
  return obj && obj[XObject._typeSymbol] === 'array';
}

XObject.isObject = function(obj) {
  return obj && obj[XObject._typeSymbol] === 'object';
}


XObject.onAccess = function(...args) {
  if (this._onAccess) {
    this._onAccess(...args);
  }
}

XObject.captureAccesses = function(func, onAccess) {
  XObject._onAccess = onAccess;
  var result = func();
  delete XObject._onAccess;
  return result;
}


export function XArray(list) {
  var observers = [];
  var map;

  function callObservers(...args) {
    for (let observer of observers) {
      observer(...args);
    }
  }

  var proxy = new Proxy({}, {
    get(_, prop) {
      if (prop === Symbol.iterator || prop === 'length') {
        XObject.onAccess(proxy, null);
      }

      if (prop === 'set') {
        return function(v) {
          list = v;
        }
      }
      else if (prop === XObject._typeSymbol) {
        return 'array';
      }
      else if (prop === XObject._contentsSymbol) {
        return list;
      }
      else if (prop === XObject._observeSymbol) {
        return function(index, observer) {
          if (index === null) {
            observers.push(observer);
          }
        }
      }
      else if (prop === XObject._removeObserverSymbol) {
        return function(index, observer) {
          if (index === null) {
            observers.splice(observers.indexOf(observer), 1);
          }
        }
      }
      else if (prop === 'push') {
        return function(el) {
          if (map) el = map(el);
          var index = list.length;
          list.push(el);
          callObservers({type: 'insert', index, el});
        }
      }

      else if (prop === 'map') {
        return function(...args) {
          XObject.onAccess(proxy, null);
          return list.map(...args);
        };
      }
      else if (prop === 'filter') {
        return function(...args) {
          XObject.onAccess(proxy, null);
          return list.filter(...args);
        };
      }
      else if (prop === 'find') {
        return function(...args) {
          XObject.onAccess(proxy, null);
          return list.find(...args);
        };
      }
      else if (prop === 'splice') {
        return function(start, deleteCount, ...items) {
          var ret = list.splice(start, deleteCount, ...items)
          if (deleteCount) {
            callObservers({type: 'remove', index: start, count: deleteCount, els: ret});            
          }
          else {
            callObservers({type: 'insert', index: start, el: items[0]});
          }
          return ret;
        }
      }

      else if (typeof list[prop] === 'function') {
        return list[prop].bind(list);
      }
      else {
        return list[prop];  
      }

    },
    set(_, index, value) {
      if (index === XObject._arrayMapSymbol) {
        map = value;
      }
      else {
        list[index] = value;
        callObservers({type: 'set', index, value});        
      }
      return true;
    }
  });

  return proxy;
};

export function XMap(obj) {
  if (obj === undefined || obj === null || obj[XObject._typeSymbol]) return obj;
  if (_.isPlainObject(obj)) {
    return XObject(_.mapValues(obj, (value) => {
      return XMap(value);
    }));
  }
  else if (_.isArray(obj)) {
    return XArray(obj.map((value) => {
      return XMap(value);
    }));
  }
  else {
    return obj;
  }
}

export function XStrip(obj) {
  if (obj === null) return null;
  else if (obj === undefined) return undefined;
  if (obj[XObject._typeSymbol]) {
    obj = obj[XObject._contentsSymbol];
  }
  if (_.isPlainObject(obj)) {
    return _.mapValues(obj, (v) => {
      return XStrip(v);
    });
  }
  else if (_.isArray(obj)) {
    return obj.map((v) => {
      return XStrip(v);
    });
  }
  else {
    return obj;
  }
}


