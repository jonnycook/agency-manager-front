import { XMap, XObject, XStrip } from './XObject';

import axios from 'axios';

import JSON2 from 'json-stringify-date';

import config from './config';

function _observeChanges(obj, path = [], observer) {
  if (XObject.isObject(obj)) {
    XObject.observe(obj, null, (type, prop, value) => {
      var completePath = path.concat(prop);
      _observeChanges(value, completePath, observer);
      observer({type:type, path:completePath, value:value});
    });

    for (var key of Object.keys(obj)) {
      _observeChanges(obj[key], path.concat(key), observer);
    }
  }
  else if (XObject.isArray(obj)) {
    XObject.observe(obj, null, (mutation) => {
      if (mutation.type === 'insert') {
        _observeChanges(mutation.el, path.concat(mutation.index), observer);
        observer({type:'insert', path: path.concat(mutation.index), el:mutation.el}); 
      }
      else if (mutation.type === 'remove') {
        observer({type:'remove', path:path, key:mutation.els[0]._id});
      }
      else if (mutation.type === 'set') {
        if (obj[mutation.index]._id) {
          _observeChanges(mutation.value, path.concat('&' + obj[mutation.index]._id), observer);
          observer({type:'set', path:path.concat('&' + obj[mutation.index]._id), value:mutation.value});          
        }
        else {
          _observeChanges(mutation.value, path.concat(mutation.index), observer);
          observer({type:'set', path:path.concat(mutation.index), value:mutation.value});
        }
      }
      // if (mutation.type === 'insert') {
      //   _observeChanges(mutation.el, path.concat(mutation.index), observer);
      //   observer({type:'insert', path: path.concat(mutation.index), el:mutation.el}); 
      // }
      // else if (mutation.type === 'remove') {
      //   observer({type:'remove', path:path, index:mutation.index});
      // }
      // else if (mutation.type === 'set') {
      //   _observeChanges(mutation.value, path.concat(mutation.index), observer);
      //   observer({type:'set', path:path.concat(mutation.index), value:mutation.value});
      // }
    });
    for (var i = 0; i < obj.length; ++ i) {
      if (obj[i] !== null && obj[i] !== undefined) {
        _observeChanges(obj[i], path.concat('&' + obj[i]._id), observer);  
      }
    }
  }
}

function observeChanges(obj, observer) {
  _observeChanges(obj, [], observer);
}


export var db = null; 


function pushToServer(data) {
  // console.log(JSON2.stringify(data));
  if (0) {
    axios.post(`${config.apiServer}push`, JSON2.stringify(data), { headers: { 'Authentication': localStorage.getItem('authKey'), 'Content-Type': 'application/json' }});    
  }
  else {
    window.g_socket.send(JSON2.stringify({
      type: 'push', 
      authKey: localStorage.getItem('authKey'),
      payload: data
    }));
  }
}


var pauseObserving = false;
export async function applyChanges(changes) {
  pauseObserving = true;
  var mutation = changes.mutation;
  if (['set', 'remove', 'insert'].includes(mutation.type)) {
    var doc = Collection.findById(changes.collection, changes._id);
    var obj = doc;
    for (var i = 0; i < mutation.path.length; ++ i) {
      let comp = mutation.path[i];
      if (comp[0] == '&') {
        var id = comp.substr(1);
        var index = obj.findIndex((el) => el._id == id);
        comp = index;
      }

      if (i == mutation.path.length - 1) {
        if (mutation.type === 'set') {
          obj[comp] = XMap(mutation.value);
        }
        else if (mutation.type === 'unset') {
          delete obj[comp];
        }
        else if (mutation.type === 'remove') {
          obj[comp].splice(obj[comp].findIndex((el) => el._id === mutation.key), 1);
        }
        else if (mutation.type == 'insert') {
          obj.splice(comp, 0, XMap(mutation.el));
        }
      }
      else {
        obj = obj[comp];
      }
    }
  }
  else if (mutation.type === 'create') {
    db[changes.collection].push(XMap(mutation.document));
  }
  else if (mutation.type === 'delete') {
    Collection.removeDocument(changes.collection, changes._id);
  }
  pauseObserving = false;
}

export async function initDb() {
  var {data} = await axios.get(`${config.apiServer}pull`, {
    headers: {'Authentication': localStorage.getItem('authKey') },
    transformResponse(data) {
      return JSON2.parse(data);
    }
  });
  db = window.db = XMap(data);
  db[XObject._accessUnsetKeySymbol] = () => XMap([]);

  XObject.observe(db, null, (type, prop, value) => {
    onCollection(prop, value);
  });

  function onDocument(collection, doc) {
    observeChanges(doc, (mutation) => {
      if (pauseObserving) return;
      pushToServer({
        collection: collection,
        _id: doc._id,
        mutation: XStrip(mutation),
      });
    });
  }

  function onCollection(name, collection) {
    collection[XObject._arrayMapSymbol] = XMap;
    for (var doc of collection) {
      onDocument(name, doc);
    }
    XObject.observe(collection, null, (mutation) => {
      if (mutation.type === 'insert') {
        onDocument(name, mutation.el);
        if (pauseObserving) return;
        pushToServer({
          collection: name,
          mutation: {
            type: 'create',
            document: XStrip(mutation.el)
          }
        });
      }
      else if (mutation.type === 'remove') {
        if (pauseObserving) return;
        pushToServer({
          collection: name,
          _id: mutation.els[0]._id,
          mutation: {
            type: 'delete',
          }
        });
      }
    });
  }

  for (var name of Object.keys(db)) {
    let collection = db[name];
    onCollection(name, collection);
  }
}

export var Collection = {
  removeDocument(name, doc) {
    db[name].splice(db[name].findIndex(d => d._id === doc._id), 1);
  },
  findById(name, id) {
    return db[name].find((doc) => doc._id === id);
  }
}


export var Models = {
  Relationship: {
    otherRelIndex(rel, entity) {
      if (rel.entities[0] === entity._id) {
        return 1;
      }
      else {
        return 0;
      }
    }

  },
  Entity: {
    relatedEntities(entity, type=null) {

      function relationships() {
        return db.relationships.filter((rel) => {
          return rel.entities.includes(entity._id);
        });
      }


      function relatedEntity(rel) {
        var id = rel.entities[Models.Relationship.otherRelIndex(rel, entity)];
        // return id;
        if (id) {
          return Collection.findById('entities', id);
        }
      }

      var entities = relationships().map(relatedEntity);
      if (type) {
        return entities.filter((e) => e.type === type);
      }
      else {
        return entities;
      }
    },

    property(entity, name) {
      return (entity.properties.find((e) => e.name === name) || {}).value;
    },
    state(entity, name) {
      return entity.state ? (entity.state.find((e) => e.name === name) || {}) : {}
    },
    display(entity, showType=true) {
      if (entity) {
          var properties = {};
          var e = entity;
          while (true) {
            for (var prop of e.properties) {
              if (!(prop.name in properties)) {
                properties[prop.name] = prop.value;
              }
            } 
            if (e.extends) {
              e = Collection.findById('entities', e.extends);
            }
            else {
              break;
            }
          }

          // var label = [];
          // for (var propName of Object.keys(properties)) {
          //   label.push(`${propName}: ${properties[propName]}`);
          // }

          var label = properties.Name ? properties.Name : Object.values(properties)[0];

          return showType ? `${label} (${entity.type})` : label;
      }
      else {
        return '(none)';
      }
    }
  }
}

