import React, { Component } from 'react';
import { XComponent, XObject, XMap, XStrip } from './XObject';
import { db, Models, Collection } from './db';
import classNames from 'classnames';

import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

import MarkdownEditor from 'react-md-editor';

import _ from 'lodash';

import juration from './juration';
import pluralize from 'pluralize';

function withRef(ref, component) {
      return new Proxy({}, {
        get(target, prop) { return prop == 'ref' ? ref : component[prop] }
      });

}

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
    if (this.props.input) {
      return this.refs.input.selectedValue();
    }
    else {
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
  }

  input() {
    if (this.props.input) {
      return withRef('input', this.props.input(this.props.get(), (value) => {
        this.props.set(value);
        this.setState({ editing: false });
      }));
    }
    else {
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
  }

  display() {
    if (this.props.display) {
      return this.props.display(this.props.get());
    }
    else {
      switch (this.props.type || 'text') {
        default:
          return this.props.get()
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

		return (
      <EditableValue
        className={this.props.className}

        type={this.props.type}

        set={(value) => this.props.object[this.props.property] = value}

        input={this.props.input}

        display={this.props.display}

        get={() => this.props.object[this.props.property]} />
    );
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

			if (!Models.Entity.display(entity, !this.props.type).match(new RegExp('(\\b|/|^)' + this.state.filter, 'i'))) {
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
						<input ref="filter" placeholder={this.props.placeholder} onKeyDown={this.actions.keyPress} onChange={(e) => this.setState({filter:e.target.value})} type="text" /> {!this.props.hideButtons && <button onClick={this.actions.cancel}>Cancel</button>}
						{!this.props.hideButtons && <button onClick={this.actions.new}>New</button>}
						{this.entries().length > 0 && <ul>
							{this.entries().map((entry, i) => (
								<li className={classNames({selected: i === this.state.selectedIndex})} key={entry.entity._id}>{entry.label}</li>
							))}
						</ul>}
					</span>) :
					<span><Link to={`/entities/${this.props.entity()}`}>{Models.Entity.display(Collection.findById('entities', this.props.entity()), !this.props.type)}</Link> <button onClick={this.actions.edit}>Edit</button></span>}
			</span>
		);	
	}
}



export class Selector extends XComponent {
  constructor() {
    super({
      actions: {
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
            this.props.onSelected(this.selectedValue())
            return false;
          }
        },
      }
    });
    this.state = {
      selectedIndex: 0
    };
  }
  selectedValue() {
    return this.entries().length ? this.entries()[this.state.selectedIndex].key : null;
  }
  entries() {
    const escape = (value) => {
      return value.replace(/\(|\)|\[|\]|\$|\^|\\/g, '\\$1');
    };

    return this.state.filter ? this.props.entries.filter((entry) => {
      return entry.display.match(new RegExp('(\\b|/|^)' + escape(this.state.filter), 'i'));
    }) : [];
  }
  xRender() {
    return (
      <span className={classNames('entity-selector', this.props.className)}>
        <input ref="filter" placeholder={this.props.placeholder} onKeyDown={this.actions.keyPress} onChange={(e) => this.setState({filter:e.target.value})} type="text" />
        {this.entries().length > 0 && <ul>
          {this.entries().map((entry, i) => (
            <li className={classNames({selected: i === this.state.selectedIndex})} key={entry.key}>{entry.display}</li>
          ))}
        </ul>}
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
        },

        deleteEntry(entry) {
          db.work_log_entries.splice(db.work_log_entries.indexOf(entry), 1);
        },

        start() {
          db.work_log_entries.push(XObject.obj({
            activity: {
              activity: this.refs.activity.value,
              object: { entity: this.props.entity._id }
            },
            start: new Date(),
            subject: db.agency_users.find((user) => user.authKey == localStorage.getItem('authKey')).entity
          }));
        },

        addToTimeline() {
          if (!this.props.entity.timeline) {
            this.props.entity.timeline = [];
          }

          this.props.entity.timeline.push(XObject.obj({
            type: 'state'
          }));
        },

        deleteTimelineEvent(event) {
          this.props.entity.timeline.splice(this.props.entity.timeline.indexOf(event), 1);
        },

        createEvent() {
          if (!this.props.entity.events) {
            this.props.entity.events = XMap([]);
          }

          this.props.entity.events.push(XObject.obj());
        },

        deleteEvent(event) {
          this.props.entity.events.splice(this.props.entity.events.indexOf(event), 1);
        },


        addToTargetTimeline() {
          if (!this.props.entity.targetTimeline) {
            this.props.entity.targetTimeline = XMap([]);
          }

          this.props.entity.targetTimeline.push(XObject.obj());
        },

        removeEntryFromTargetTimeline(entity) {
          this.props.entity.targetTimeline.splice(this.props.entity.targetTimeline.indexOf(entity), 1);
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

  componentWillMount() {
    if (!this.props.entity.data) {
      this.props.entity.data = [];
    }
  }

  workLogEntries() {
    var authKey = localStorage.getItem('authKey');
    var user = db.agency_users.find((user) => user.authKey == authKey);
    return db.work_log_entries.filter((workLogEntry) => {
      return workLogEntry.activity.object.entity == this.props.entity._id// && workLogEntry.subject == user.entity
    });
  }

  workTime() {
    return this.workLogEntries().reduce((totalTime, entry) => {
      return (entry.end || new Date()).getTime() - entry.start.getTime() + totalTime;
    }, 0);
  }

  workPeriods() {
    return db.work_periods.filter((workPeriod) => workPeriod.baseEntity == this.props.entity._id).sort((a, b) => a.startDate < b.startDate ? -1 : 1);
  }

  notes() {
    var notes = [];
    for (var entity of db.entities) {
      for (var datum of entity.data) {
        if (datum.content.type == 'entity notes') {
          if (datum.content.body) {
            for (var note of datum.content.body) {
              if (note.entity == this.props.entity._id) {
                notes.push({
                  entity: entity,
                  notes: note.value
                });
              }
            }
          }
        }
      }
    }
    return notes;
  }


  xRender() {
    var workLogEntries = this.workLogEntries();
    var workPeriods = this.workPeriods();
    var notes = this.notes();

    return (
      <div className="entity" key={this.props.entity._id}>
        <h1>
          <Link to={`/entities/${this.props.entity._id}`}>{Models.Entity.display(this.props.entity)}</Link>
          <span className="start-timer">
            <select ref="activity">
              {['Communication', 'Development', 'Management', 'Estimation', 'Scoping', 'Orienting'].map((activity) => {
                return (
                  <option key={activity}>{activity}</option>
                );
              })} 
            </select>
            <button onClick={this.actions.start}>Start</button>
          </span>
        </h1>
        <div className="entity__properties">
          <h1>Entity</h1>
          {this.props.entity._created && <div className="creation-info">
            Created on {this.props.entity._created.timestamp.toString()} by {Models.Entity.display(Collection.findById('entities', Collection.findById('agency_users', this.props.entity._created.user).entity), false)}
          </div>}
          <div>
            <label>Type: </label>
            <PropertyField object={this.props.entity} property="type" type="text/line" />
          </div>

          <div>
            <label>Object: </label>
            <PropertyField object={this.props.entity} property="object" type="bool" />
          </div>

          <div>
            <label>Descriptor: </label>
            <PropertyField object={this.props.entity} property="descriptor" type="text/line" />
          </div>

          <div>
            <label>Content: </label>
            <PropertyField
              object={this.props.entity}
              property="content"
              display={(value) => <ViewTypedValue value={value} />}
              input={(value, update) => {
                if (!value) value = XMap({});
                return <EditTypedValue value={value} done={() => update(value)} />
              }} />
          </div>

          <div>
            <label>Timeframe: </label>
            <PropertyField object={this.props.entity} property="timeframe" type="text/line" />
          </div>

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

          <h2>Related Entities</h2>
          <ul>
            {this.relationships().reduce((grouped, rel) => {
              var entity = Collection.findById('entities', rel.entities[this.otherRelIndex(rel)]);
              if (entity && entity.timeframe && parseInt(entity.timeframe)) return grouped;

              var index = grouped.findIndex((g) => g.type == (entity ? entity.type : '(none)'));
              if (index != -1) {
                grouped[index].rels.push(rel);
              }
              else {
                grouped.push({
                  type: entity ? entity.type : '(none)',
                  rels: [rel]
                })
              }
              return grouped;
            }, []).sort((a, b) => a.type < b.type ? -1 : 1).map(group => {
              return (
                <div key={group.type}>
                  <h3>{group.rels.length == 1 ? group.type : pluralize(group.type)}</h3>
                  <ul>
                    {group.rels.sort((a, b) => {
                      var aEntity = a.entities[this.otherRelIndex(a)];
                      var bEntity = b.entities[this.otherRelIndex(b)];
                      var aName = Models.Entity.display(Collection.findById('entities', aEntity));
                      var bName = Models.Entity.display(Collection.findById('entities', bEntity));
                      return aName < bName ? -1 : 1;
                    }).map((rel) => {
                      return (
                        <li key={`${rel._id}`}>
                          <EntitySelector type={false} set={(value) => rel.entities[this.otherRelIndex(rel)] = value} entity={() => rel.entities[this.otherRelIndex(rel)]} />
                          <div>
                            <label>Directed: </label>
                            <PropertyField type="bool" object={rel} property="directed" />
                          </div>
                          {rel.directed && <div>
                            <div>
                              <label>Start Point: </label>
                              <EditableValue type="bool" get={() => rel.entities[0] === this.props.entity._id} set={v => this.actions.toggleStartPoint.invoke(rel, v)} />
                            </div>
                            <div>
                              <label>Internal: </label>
                              <PropertyField type="bool" object={rel} property="internal" />
                            </div>
                          </div>}
                          <button onClick={this.actions.deleteRelationship(rel)}>Delete</button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </ul>
          <button onClick={this.actions.addRelationship}>Add</button>
       	</div>

        {/*<div>
          <span>Extends:</span>
          <EditableValue get={() => this.props.entity.extends} set={(value) => this.props.entity.extends = value} />
          {this.props.entity.extends && <Entity entity={Collection.findById('entities', this.props.entity.extends)} />}
        </div>*/}

        <h2>Target Timeline</h2>
        <ul>
          {this.props.entity.targetTimeline && this.props.entity.targetTimeline.map((entry) => {
            return (
              <li key={entry._id}>
                <div>
                  <label>Event: </label>
                  <PropertyField
                    object={entry}
                    property="event"
                    display={(value) => (this.props.entity.events && this.props.entity.events.find((event) => event._id == value) || {descriptor:'(none)'}).descriptor}
                    input={(event, update) => 
                      <Selector
                        entries={this.props.entity.events.map((event) => ({ display: event.descriptor || '(none)', key: event._id }))}
                        onSelected={(key) => update(key)} />} />
                </div>
                <div>
                  <label>Time: </label>
                  <PropertyField object={entry} property="time" type="datetime" />
                </div>
                <div>
                  <label>Source: </label>
                  <PropertyField object={entry} property="source" type="text/line" />
                </div>
                <button onClick={this.actions.removeEntryFromTargetTimeline.bind(entry)}>Remove</button>
              </li>
            );
          })}
        </ul>
        <button onClick={this.actions.addToTargetTimeline}>Add</button>

        {/*<h2>Timeline</h2>
        <ul>
          {this.props.entity.timeline && this.props.entity.timeline.map((event) => {
            return (
              <li key={event._id}>
                <div>
                  <label>Time: </label>
                  <PropertyField object={event} property="time" type="datetime" />
                  <Property property={event.state ? event.state : event.state = XObject.obj()} />
                </div>
                <button onClick={this.actions.deleteTimelineEvent.bind(event)}>Delete</button>
              </li>
            );
          })}
        </ul>
        <button onClick={this.actions.addToTimeline}>Add</button>*/}

        <h2>Events</h2>
        <ul>
          {this.props.entity.events && this.props.entity.events.map((event) => {
            return (
              <li key={event._id}>
                <div>
                  <label>Descriptor:</label>
                  <PropertyField object={event} property="descriptor" type="text/line" />
                </div>
                <button onClick={this.actions.deleteEvent.bind(event)}>Delete</button>
              </li>
            );
          })}
        </ul>
        <button onClick={this.actions.createEvent}>Create</button>



        {notes.length > 0 && <div>
          <h2>Notes</h2>
          <ul>
          {notes.map((note) => {
            return (
              <li key={note.entity._id}>
                <Link to={`/entities/${note.entity._id}`}>{Models.Entity.display(note.entity)}</Link>
                <ReactMarkdown className="value-text-block" source={note.notes} softBreak="br" />
              </li>
            );
          })} 
          </ul>  
        </div>}

        <div className="data">
          <h2>Data</h2>
          <ul>
          	{_.map(this.groupedData(), (group, key) => {
          		return (
                <li className="data-group" key={key}>
            			<h3>{key}</h3>
    			        <ul>
    			          {group.map(datum => {
    			            return (
    			              <li key={datum._id}>
    			                <Datum entity={this.props.entity} datum={datum} onDelete={this.actions.deleteDatum(datum)} />
    			              </li>
    			            );
    			          })}
    			        </ul>
            		</li>
              );
          	})}
          </ul>
          <button onClick={this.actions.addDatum}>Add Data</button>
       	</div>

        <div>
          <h2>Work</h2>
          {workLogEntries.length > 0 && <div className="work-log-entries">
            <h3>Log ({juration.stringify(this.workTime()/1000)})</h3>
            <ul>
              {workLogEntries.map((entry) => {
                return (
                  <li key={entry._id}>
                    <div>
                      <label>Subject: </label>
                      <PropertyField type="entity" object={entry} property="subject" />
                    </div>
                    <div>
                      <label>Description: </label>
                      <PropertyField type="text" object={entry} property="description" />
                    </div>
                    <div>
                      <label>Start: </label>
                      <PropertyField type="datetime" object={entry} property="start" />
                    </div>
                    <div>
                      <label>End: </label>
                      <PropertyField type="datetime" object={entry} property="end" />
                    </div>
                    <div>
                      <label>Duration: </label>
                      <PropertyField type="duration"
                        object={{
                          get duration() {
                            return Math.floor((entry.end || new Date()).getTime() - entry.start.getTime())/1000;
                          },
                          set duration(v) {
                            entry.end = new Date(entry.start.getTime() + v*1000);
                          }
                        }}
                        property="duration" />
                    </div>
                    <div>
                      <label>Activity: </label>
                      <PropertyField type="text" object={entry} property="activity.activity" />
                    </div>
                    <button onClick={this.actions.deleteEntry.bind(entry)}>Delete</button>
                  </li>
                );
              })}
            </ul>
          </div>}

          {workPeriods.length > 0 && <div className="work-periods">
            <h3>Periods</h3>
            <ul>
              {workPeriods.map((workPeriod) => {
                return (
                  <li key={workPeriod._id}><Link to={`/work-periods/${workPeriod._id}`}>{workPeriod.startDate.format('{yyyy}-{MM}-{dd}')}</Link></li>
                );
              })}
            </ul>
          </div>}
        </div>
      </div>
    );
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
      <option>datetime</option>
      <option>entity notes</option>
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
      case 'datetime':
        return <span className={this.props.className}>{this.props.value && this.props.value.format('{yyyy}-{MM}-{dd} {HH}:{mm}:{ss}')}</span>
      case 'local file':
        return <span className={this.props.className}>{this.props.value && this.props.value[localStorage.getItem('context')]}</span>
      case 'entity notes':
        return (
          <ul>
            {(this.props.value || []).map((entry) => {
              return (
                <li key={entry._id}>
                  <Link to={`/entities/${entry.entity}`}>{Models.Entity.display(Collection.findById('entities', entry.entity))}</Link>
                  <ReactMarkdown className="value-text-block" source={entry.value} softBreak="br" />
                </li>
              );
            })}
          </ul>
        );
      default:
        return <span className={this.props.className}>{this.props.value && this.props.value.toString()}</span>;  
    }
  }
}

class EntityNotesInput extends XComponent {
  constructor() {
    super({
      actions: {
        addEntry() {
          this.value.push(XObject.obj());
        },
        deleteEntry(entry) {
          this.value.splice(this.value.indexOf(entry), 1);
        }
      }
    });
  }

  componentWillMount() {
    this.value = this.props.value || XMap([]);
  }

  xRender() {
    return (
      <div>
        <ul>
          {this.value.map((entry) => {
            return (
              <li key={entry._id}>
                <PropertyField object={entry} property="entity" type="entity" />
                <MarkdownEditor options={{lineWrapping:true}} value={entry.value} onChange={(value) => entry.value = value} />
                <button onClick={this.actions.deleteEntry.bind(entry)}>Delete</button>
              </li>
            );
          })}
        </ul>
        <button onClick={this.actions.addEntry.bind()}>Add</button>
      </div>
    );
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
      case 'datetime':
        return <input type="text" ref="input" onKeyDown={(e) => e.key === 'Enter' && this.props.onEnter && this.props.onEnter()} defaultValue={this.state.value && this.state.value.format('{yyyy}-{MM}-{dd} {HH}:{mm}:{ss}')} />;
      case 'entity notes':
        return <EntityNotesInput ref="input" value={this.state.value} />
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
      case 'datetime':
        return Date.create(this.refs.input.value);
      case 'entity notes':
        return this.refs.input.value;
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


class EditTypedValue extends XComponent {
  save() {
    this.props.value.type = this.refs.valueInput.type;
    this.props.value.content = this.refs.valueInput.value;
    this.props.done();
  }

  selectedValue() {
    return this.valueInput.value;
  }

  xRender() {
    return (
      <span>
        <ValueInput ref="valueInput" type={() => this.props.value.type} value={() => this.props.value.content} onEnter={this.save.bind(this)} />
        <button onClick={this.save.bind(this)}>Save</button>
      </span>
    );
  }
}

class ViewTypedValue extends XComponent {
  xRender() {
    return this.props.value ? <ValueDisplay type={this.props.value.type} value={this.props.value.content} /> : null;
  }
}

class TypedValue extends XComponent {
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
      {this.state.editing ?
        <EditTypedValue ref="edit" done={() => this.setState({editing: false})} value={this.props.value} /> :
        <ViewTypedValue value={this.props.value} />}
      <button onClick={this.action_toggleEdit.bind(this)}>{this.state.editing ? 'Cancel' : 'Edit'}</button>
    </div>
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
      {this.state.editing ?
        <EditDataContent ref="edit" done={() => this.setState({editing: false})} datum={this.props.datum} /> :
        <ViewDataContent datum={this.props.datum} />}
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
  		return <div className="description string"><b>
  			<EditableValue get={() => this.props.datum.description} set={(value) => this.props.datum.description = value} />
  			<button onClick={this.actions.addDescription}>Add</button></b>
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
