import React, { Component } from 'react';
import { XComponent, XObject, XMap, XStrip } from './XObject';
import { db, Models, Collection } from './db';
import classNames from 'classnames';

import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

import MarkdownEditor from 'react-md-editor';

import _ from 'lodash';

import juration from 'juration';

export class EditableValue extends XComponent {
  constructor() {
    super();
    this.state = { editing: false };
  }
  action_save() {
    this.props.set(this.extractValue());
    this.setState({ editing: false });
  }
  action_cancel() {
    this.setState({ editing: false });
  }
  action_edit() {
    this.setState({ editing: true });
  }

  extractValue() {
    switch (this.props.type || 'text') {
      default:
        return this.refs.input.value;
      case 'date': 
        try {
          return Date.create(this.refs.input.value);          
        }
        catch (e) {
          return null;
        }
      case 'datetime': 
        try {
          return Date.create(this.refs.input.value);          
        }
        catch (e) {
          return null;
        }
      case 'bool':
        return this.refs.input.checked;

      case 'duration':
        return juration.parse(this.refs.input.value);
    }
  }

  input() {
    switch (this.props.type || 'text') {
      default:
      case 'text':
        return <input type="text" ref="input" onKeyPress={(e) => e.key === 'Enter' && this.action_save()} defaultValue={this.props.get()} />;

      case 'duration':
        return <input type="text" ref="input" onKeyPress={(e) => e.key === 'Enter' && this.action_save()} defaultValue={this.props.get() ? juration.stringify(this.props.get()) : ''} />;

      case 'date':
        return <input type="date" ref="input" onKeyPress={(e) => e.key === 'Enter' && this.action_save()} defaultValue={this.props.get() && this.props.get().format('{yyyy}-{MM}-{dd}')} />;
      case 'datetime':
        return <input type="datetime" ref="input" onKeyPress={(e) => e.key === 'Enter' && this.action_save()} defaultValue={this.props.get() && this.props.get().format('{yyyy}-{MM}-{dd} {HH}:{mm}:{ss}')} />;

      case 'bool':
        return <input ref="input" defaultChecked={this.props.get()} type="checkbox" />
    }
  }

  display() {
    switch (this.props.type || 'text') {
      default:
      case 'text':
        return this.props.get() && this.props.get().toString();
      case 'date':
        return this.props.get() && this.props.get().format('{yyyy}-{MM}-{dd}');
      case 'datetime':
        return this.props.get() && this.props.get().format('{yyyy}-{MM}-{dd} {HH}:{mm}:{ss}');

      case 'bool':
        return this.props.get() ? 'Yes' : 'No';

      case 'duration':
        return this.props.get() && juration.stringify(this.props.get());
    }
  }
  xRender() {
    if (this.props.type == 'entity') {
      return <EntitySelector entity={() => this.props.get()} set={this.props.set} />
    }
    return (
      this.state.editing ?
        <span className={this.props.className}>
          {this.input()}
          <button onClick={this.action_save.bind(this)}>Save</button>
          <button onClick={this.action_cancel.bind(this)}>Cancel</button>
        </span> :
        <span className={this.props.className}>
          {this.display()}
          <button onClick={this.action_edit.bind(this)}>Edit</button>
        </span>
    );
  }
}

export class PropertyField extends XComponent {
	xRender() {
		return <EditableValue type={this.props.type} className={this.props.className} get={() => this.props.object[this.props.property]} set={(value) => this.props.object[this.props.property] = value} />;
	}
}


export class EntitySelector extends XComponent {
	constructor() {
		super({
			actions: {
				edit() {
					this.setState({
						editing: true,
						filter: null,
						selectedIndex: Math.max(0, this.entries().findIndex(entry => entry.entity._id === this.props.entity()))
					});

					setTimeout(() => {
						this.refs.filter.focus();
					}, 10);
				},
				cancel() {
					this.setState({
						editing: false,
					})
				},
				keyPress(event) {
					if (event.key === 'ArrowDown') {

						if (this.entries().length) {
							this.setState({
								selectedIndex: (this.state.selectedIndex + 1) % this.entries().length
							});

						}
						return false;
					}
					else if (event.key === 'ArrowUp') {
						if (this.entries().length) {
							this.setState({
								selectedIndex: (this.state.selectedIndex - 1 + this.entries().length) % this.entries().length
							});

						}
						return false;
					}
					else if (event.key === 'Enter') {
						this.props.set(this.entries().length ? this.entries()[this.state.selectedIndex].entity._id : null);
						this.refs.filter.value = '';
						this.setState({
							filter: '',
							selectedIndex: 0
						})
						if (!this.props.editing) {
							this.setState({
								editing: false
							});
						}
						return false;
					}
				},
				new() {
					var entity = XMap({
            _id: XObject.id(),
            type: '',
            properties: [],
            data: [],
          });
          this.newEntity = entity;

					this.setState({
						new: true,
						editing: true
					});
				},
				cancelNew() {
					this.setState({
						new: false
					})
				},
				saveNew() {
					db.entities.push(this.newEntity);
					this.props.set(this.newEntity._id);
					this.setState({
						editing: false,
						new: null
					});
				}
			}
		});
		this.state = {
			editing: false,
			selectedIndex: 0
		};
	}
	save() {

	}
	componentWillMount() {
		if ('editing' in this.props) {
			this.setState({
				editing: this.props.editing
			});
		}
	}
	entries() {
		return this.state.filter ? db.entities.filter((entity) => {
			if (this.props.type) {
				if (entity.type !== this.props.type) return false;
			}

			if (!Models.Entity.display(entity, !this.props.type).match(new RegExp('(\b|^)' + this.state.filter, 'i'))) {
				return false;
			}

			return true;
		}).map((entity) => {
			return {
				entity: entity,
				label: Models.Entity.display(entity, !this.props.type)
			}
		}) : [];
	}
	xRender() {
		return (
			<span className={classNames('entity-selector', this.props.className)}>
				{this.state.editing ?
					(this.state.new ? <div>
						<Entity entity={this.newEntity} />
						<button onClick={this.actions.saveNew}>Save</button>
						<button onClick={this.actions.cancelNew}>Cancel</button>
					</div> : <span>
						<input ref="filter" onKeyDown={this.actions.keyPress} onChange={(e) => this.setState({filter:e.target.value})} type="text" /> {!this.props.hideButtons && <button onClick={this.actions.cancel}>Cancel</button>}
						{!this.props.hideButtons && <button onClick={this.actions.new}>New</button>}
						<ul>
							{this.entries().map((entry, i) => (
								<li className={classNames({selected: i === this.state.selectedIndex})} key={entry.entity._id}>{entry.label}</li>
							))}
						</ul>
					</span>) :
					<span><Link to={`/entities/${this.props.entity()}`}>{Models.Entity.display(Collection.findById('entities', this.props.entity()), !this.props.type)}</Link> <button onClick={this.actions.edit}>Edit</button></span>}
			</span>
		);	
	}
}


export class Entity extends XComponent {
  constructor() {
    super({
      actions: {
        addRelationship() {
          db.relationships.push({
            _id: XObject.id(),
            entities: [this.props.entity._id],
          });
        },
        deleteRelationship(rel) {
          Collection.removeDocument('relationships', rel);
        },


        addProperty() {
          this.props.entity.properties.push(XMap({_id:XObject.id()}));
        },
        deleteProperty(property) {
          this.props.entity.properties.splice(this.props.entity.properties.findIndex(p => property._id === p._id), 1);
        },

        addState() {
          if (!this.props.entity.state) {
            this.props.entity.state = XMap([]);
          }
          this.props.entity.state.push(XMap({_id:XObject.id()}));
        },
        deleteState(state) {
          this.props.entity.state.splice(this.props.entity.state.findIndex(p => state._id === p._id), 1);
        },

        deleteDatum(datum) {
          this.props.entity.data.splice(this.props.entity.data.findIndex(p => datum._id === p._id), 1);
        },

        addDatum() {
          this.props.entity.data.push(XMap({
            _id: XObject.id(),
            content: {}
          }));
        },

        toggleStartPoint(rel, isStartPoint) {
          var otherId = rel.entities[Models.Relationship.otherRelIndex(rel, this.props.entity)];
          if (isStartPoint) {
            rel.entities = [this.props.entity._id, otherId];
          }
          else {
            rel.entities = [otherId, this.props.entity._id];
          }
        }
      }
    });
  }

  relationships() {
    return db.relationships.filter((rel) => {
      return rel.entities.includes(this.props.entity._id);
    });
  }

  otherRelIndex(rel) {
    if (rel.entities[0] === this.props.entity._id) {
      return 1;
    }
    else {
      return 0;
    }
  }

  relatedEntity(rel) {
    var id = rel.entities[this.otherRelIndex(rel)];
    // return id;
    if (id) {
      return Collection.findById('entities', id);
    }
  }

  groupedData() {
  	var grouped = {};
  	for (var datum of this.props.entity.data) {
  		var key;
  		if (_.isString(datum.description)) {
  			key = datum.description;
  		}
  		else if (datum.description) {
  			key = datum.description.Type;
  		}


  		if (!grouped[key]) {
  			grouped[key] = [];
  		}

  		grouped[key].push(datum);
  	}
  	return grouped;
  }

  xRender() {
    return <div className="entity" key={this.props.entity._id}>
        <div className="entity__properties">
	        <h2>Properties</h2>
	        <ul>
	          {this.props.entity.properties.map(prop => {
	            return <li key={prop._id}>
	              <Property property={prop} />
	              <button onClick={this.actions.deleteProperty(prop)}>Delete</button>
	            </li>
	          })}
	        </ul>
	        <button onClick={this.actions.addProperty}>Add</button>
       	</div>

        <h1><Link to={`/entities/${this.props.entity._id}`}>{Models.Entity.display(this.props.entity)}</Link></h1>
        <div>
          <span>Type:</span>
          <EditableValue get={() => this.props.entity.type} set={(value) => this.props.entity.type = value} />
        </div>
        <div>
          <span>Extends:</span>
          <EditableValue get={() => this.props.entity.extends} set={(value) => this.props.entity.extends = value} />

          {this.props.entity.extends && <Entity entity={Collection.findById('entities', this.props.entity.extends)} />}
        </div>


        <h2>State</h2>
        <ul>
          {this.props.entity.state && this.props.entity.state.map(prop => {
            return <li key={prop._id}>
              <Property property={prop} />
              <button onClick={this.actions.deleteState(prop)}>Delete</button>
            </li>
          })}
        </ul>
        <button onClick={this.actions.addState}>Add</button>

        <div className="data">
        <h2>Data</h2>
        <ul>
        	{_.map(this.groupedData(), (group, key) => {
        		return <li className="data-group" key={key}>
        			<h3>{key}</h3>
			        <ul>
			          {group.map(datum => {
			            return (
			              <li key={datum._id}>
			                <Datum/* hideDescription={key}*/ entity={this.props.entity} datum={datum} onDelete={this.actions.deleteDatum(datum)} />
			              </li>
			            );
			          })}
			        </ul>

        		</li>;
        	})}
        </ul>
        {/*<ul>
          {this.props.entity.data.map(datum => {
            return (
              <li key={datum._id}>
                <Datum datum={datum} onDelete={this.actions.deleteDatum(datum)} />
              </li>
            );
          })}
        </ul>*/}
        <button onClick={this.actions.addDatum}>Add Data</button>
       	</div>

        <h2>Relationships</h2>
        <ul>
          {this.relationships().map(rel => {
            return (
              <li key={`${rel._id}`}>
                <EntitySelector set={(value) => rel.entities[this.otherRelIndex(rel)] = value} entity={() => rel.entities[this.otherRelIndex(rel)]} />
                <div>
                  <label>Directed: </label>
                  <PropertyField type="bool" object={rel} property="directed" />
                </div>
                {rel.directed && <div>
                  <label>Start Point: </label>
                  <EditableValue type="bool" get={() => rel.entities[0] === this.props.entity._id} set={v => this.actions.toggleStartPoint.invoke(rel, v)} />
                </div>}
                <button onClick={this.actions.deleteRelationship(rel)}>Delete</button>
              </li>
            );
          })}
        </ul>
        <button onClick={this.actions.addRelationship}>Add</button>
      </div>;
  }
}


class ValueTypeSelector extends XComponent {
  get value() {
    return this.refs.select.value;
  }
  xRender() {
      return <select ref="select" {...this.props}>
        <option></option>
        <option>text/line</option>
        <option>text/block</option>
        <option>file</option>
        <option>local file</option>
        <option>URL</option>
        <option>date</option>
      </select>
  }
}

export class ValueDisplay extends XComponent {
  xRender() {
    switch (this.props.type) {
      case 'text/block':
        return <ReactMarkdown className="value-text-block" source={this.props.value || ''} softBreak="br" />;
      case 'URL':
        return <a className="value-url" href={this.props.value} target="_blank">(link)</a>;
      case 'date':
        return <span className={this.props.className}>{this.props.value ? this.props.value.format('{yyyy}-{MM}-{dd}') : null}</span>
      case 'local file':
        return <span className={this.props.className}>{this.props.value && this.props.value[localStorage.getItem('context')]}</span>
      default:
        return <span className={this.props.className}>{this.props.value.toString()}</span>;  
    }
  }
}

class ValueInput extends XComponent {
  constructor() {
    super();
    this.state = { type: '' };
  }
  componentWillMount() {
    this.setState({
      type: this.props.type(),
      value: this.props.value(),
    });
  }

  input() {
    switch (this.state.type) {
      case 'text/block':
        return <MarkdownEditor ref="body" options={{lineWrapping:true}} value={this.state.value} onChange={(value) => this.setState({value})} />;
      case 'date':
        return <input ref="body" defaultValue={this.state.value && Date.create(this.state.value).format('{yyyy}-{MM}-{dd}')} type="date" onKeyDown={(e) => e.key === 'Enter' && this.props.onEnter && this.props.onEnter()} />;
      case 'local file':
        return <input ref="body" defaultValue={this.state.value && this.state.value[localStorage.getItem('context')]} type="text" onKeyDown={(e) => e.key === 'Enter' && this.props.onEnter && this.props.onEnter()} />;
      default:
        return <input ref="body" defaultValue={this.state.value} type="text" onKeyDown={(e) => e.key === 'Enter' && this.props.onEnter && this.props.onEnter()} />;
    }
  }

  get type() {
    return this.refs.type.value;
  }

  get value() {
    switch (this.state.type) {
      case 'text/block':
        return this.state.value;
      case 'local file':
        return Object.assign({}, this.state.value, {
          [localStorage.getItem('context')]: this.refs.body.value,
        });
      default:
        return this.refs.body.value;
    }
  }

  xRender() {
    return <span className="edit-value">
      <ValueTypeSelector ref="type" defaultValue={this.state.type} onChange={() => this.setState({type:this.refs.type.value})} />
      {this.input()}
    </span>;
  }
}

class EditDataContent extends XComponent {
  save() {
    this.props.datum.content.type = this.refs.valueInput.type;
    this.props.datum.content.body = this.refs.valueInput.value;
    this.props.done();
  }

  xRender() {
    return (
      <span>
        <ValueInput ref="valueInput" type={() => this.props.datum.content.type} value={() => this.props.datum.content.body} onEnter={this.save.bind(this)} />
        <button onClick={this.save.bind(this)}>Save</button>
      </span>
    );
  }
}

class ViewDataContent extends XComponent {
  xRender() {
    return this.props.datum.content && <ValueDisplay type={this.props.datum.content.type} value={this.props.datum.content.body} />
  }
}


class DataContent extends XComponent {
  constructor() {
    super();
    this.state = {
      editing: false
    };
  }

  action_toggleEdit() {
    this.setState({ editing: !this.state.editing });
  }

  xRender() {
    return <div className="content">
      {this.state.editing ? <EditDataContent ref="edit" done={() => this.setState({editing: false})} datum={this.props.datum} /> : <ViewDataContent datum={this.props.datum} />}
      <button onClick={this.action_toggleEdit.bind(this)}>{this.state.editing ? 'Cancel' : 'Edit'}</button>
      <a href={`agency://entities/${this.props.entity._id}/data/${this.props.datum._id}`}>External Edit</a>
    </div>
  }
}

class DatumDescriptionLine extends XComponent {
	constructor() {
		super({
			actions: {
				edit() {
					this.setState({
						editing: true
					});
				},
				save() {
					this.props.submit(this.refs.name.value, this.refs.value.value);
					this.setState({
						editing: false
					})
				},
				delete() {
					this.props.delete();
				},
				cancel() {
					this.setState({
						editing: false
					})
				}
			}
		});
		this.state = {
			editing: false
		};
	}
	xRender() {
		return (
			this.state.editing ? 
			 <div className="description-line">
				<input ref="name" type="text" defaultValue={this.props.name} />: <input ref="value" type="text" defaultValue={this.props.value} />
				<button onClick={this.actions.save}>Save</button>
				<button onClick={this.actions.delete}>Delete</button>
				<button onClick={this.actions.cancel}>Cancel</button>
			</div>

			: <h4 className="description-line">
				{this.props.name}: {this.props.value}
				<button onClick={this.actions.edit}>Edit</button>
			</h4>
	  );
	}
}

class Datum extends XComponent {
  constructor() {
    super({
    	actions: {
    		addDescription() {
    			if (_.isString(this.props.datum.description) || !this.props.datum.description) {
    				this.props.datum.description = XMap({
    					'<untitled>': this.props.datum.description
    				})
    			}
    			else {
    				this.props.datum.description['<untitled>'] = '';
    			}	
    		}
    	}
    });
    this.state = {
      editingDescription: false
    };
  }
  action_editDescription() {
    this.setState({
      editingDescription: true
    });
  }
  action_saveDescription() {
    this.props.datum.description = this.refs.description.value;
    this.setState({
      editingDescription: false
    });

  }
  action_cancelDescription() {
    this.setState({
      editingDescription: false
    });
  }
  deleteDescription(key) {
  	delete this.props.datum.description[key];
  	if (!Object.keys(this.props.datum.description).length) {
  		this.props.datum.description = '';
  	}
  }
  updateDescription(oldKey, newKey, newValue) {
  	delete this.props.datum.description[oldKey];
  	this.props.datum.description[newKey] = newValue;
  }
  description() {
  	if (_.isString(this.props.datum.description) || !this.props.datum.description) {
  		// if (this.props.hideDescription == this.props.datum.description) return;
  		return <div className="description string">
  			<EditableValue get={() => this.props.datum.description} set={(value) => this.props.datum.description = value} />
  			<button onClick={this.actions.addDescription}>Add</button>
  		</div>
  	}
  	else {
  		return <div className="description object"><ul>
  			{Object.keys(this.props.datum.description).map((key) => {
  				// if (this.props.hideDescription === this.props.datum.description[key]) {
  				// 	return;
  				// }
	  			return <li key={key}>
	  				<DatumDescriptionLine name={key} value={this.props.datum.description[key]} delete={() => this.deleteDescription(key)} submit={(newKey, value) => this.updateDescription(key, newKey, value)} />
	  			</li>
	  		})}
  		</ul><button onClick={this.actions.addDescription}>Add</button></div>;
  	}
  }
  xRender() {
    return (
      <div className="datum item">
        {this.description()}
        <DataContent entity={this.props.entity} datum={this.props.datum} />
        <button onClick={() => this.props.onDelete(this.props.datum)}>Remove</button>
      </div>
    );
  }
}

class Property extends XComponent {
  constructor() {
    super();
    this.state = {
      editing: false
    }; 
  }
  action_cancel() {
    this.setState({ editing: false })
  }
  action_save() {
    this.props.property.name = this.refs.name.value;
    this.props.property.value = this.refs.valueInput.value;
    this.props.property.type = this.refs.valueInput.type;
    this.setState({ editing: false })
  }
  action_edit() {
    this.setState({ editing: true })
  }

  renderValueInput() {
    return <ValueInput ref="valueInput" type={() => this.props.property.type} value={() => this.props.property.value} onEnter={this.action_save.bind(this)} />
  }

  renderValueDisplay() {
    return <ValueDisplay className="property__value" type={this.props.property.type} value={this.props.property.value} />;
  }

  xRender() {
    return (
      this.state.editing ? (
        <div>
          <input type="text" ref="name" defaultValue={this.props.property.name} />
          {this.renderValueInput()}
          <button onClick={this.action_save.bind(this)}>Save</button>
          <button onClick={this.action_cancel.bind(this)}>Cancel</button>
        </div>

      ) : (
        <div className="property">
          <span className="property__name">{this.props.property.name}:</span>
          {this.renderValueDisplay()}
          <button onClick={this.action_edit.bind(this)}>Edit</button>
        </div>
      )
    );
  }
}
