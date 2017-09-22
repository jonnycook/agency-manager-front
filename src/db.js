import { XMap, XObject, XStrip } from './XObject';

import axios from 'axios';

import JSON2 from 'json-stringify-date';

function _observeChanges(obj, path = [], observer) {
  if (XObject.isObject(obj)) {
    XObject.observe(obj, null, (type, prop, value) => {
      var completePath = path.concat(prop);
      _observeChanges(value, completePath, observer);
      // var changes = {};
      // var c = changes;
      // for (var i = 0; i < completePath.length; ++ i) {
      //   if (i == completePath.length - 1) {
      //     c[completePath[i]] = value;
      //   }
      //   else {
      //     c = c[completePath[i]] = {};
      //   }
      // }
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
        observer({type:'remove', path:path, index:mutation.index});
      }
      else if (mutation.type === 'set') {
        _observeChanges(mutation.value, path.concat(mutation.index), observer);
        observer({type:'set', path:path.concat(mutation.index), value:mutation.value});
      }
    });
    for (var i = 0; i < obj.length; ++ i) {
      _observeChanges(obj[i], path.concat(i), observer);
    }
  }
}

function observeChanges(obj, observer) {
  _observeChanges(obj, [], observer);
}


export var db = null; 

export async function initDb() {
  var {data} = await axios.get('http://localhost:8000/v1/pull', {
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
      axios.post('http://localhost:8000/v1/push', JSON2.stringify({
        collection: collection,
        _id: doc._id,
        mutation: XStrip(mutation),
      }), { headers: { 'Authentication': localStorage.getItem('authKey'), 'Content-Type': 'application/json' }});
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
        axios.post('http://localhost:8000/v1/push', JSON2.stringify({
          collection: name,
          mutation: {
            type: 'create',
            document: XStrip(mutation.el)
          }
        }), { headers: { 'Authentication': localStorage.getItem('authKey'), 'Content-Type': 'application/json' }});
      }
      else if (mutation.type === 'remove') {
        axios.post('http://localhost:8000/v1/push', JSON2.stringify({
          collection: name,
          _id: mutation.els[0]._id,
          mutation: {
            type: 'delete',
          }
        }), { headers: { 'Authentication': localStorage.getItem('authKey'), 'Content-Type': 'application/json' }});
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
  Entity: {
    relatedEntities(entity, type=null) {

      function relationships() {
        return db.relationships.filter((rel) => {
          return rel.entities.includes(entity._id);
        });
      }

      function otherRelIndex(rel) {
        if (rel.entities[0] === entity._id) {
          return 1;
        }
        else {
          return 0;
        }
      }

      function relatedEntity(rel) {
        var id = rel.entities[otherRelIndex(rel)];
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

