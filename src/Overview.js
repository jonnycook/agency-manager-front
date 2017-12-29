import React, { ReactDComponent } from 'react';
import ReactDOM from 'react-dom';
import { XComponent, XObject, XMap, XStrip } from './XObject';
import { db, Models, Collection } from './db';
import classNames from 'classnames';

import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';

import MarkdownEditor from 'react-md-editor';

import _ from 'lodash';

import juration from './juration';
import pluralize from 'pluralize';

import { DragSource, DragDropContext, DropTarget } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import $ from 'jquery';



class AddEntityForm extends XComponent {
	constructor() {
		super({
			actions: {
				content() {
					this.setState({
						type: 'content'
					});
				},
				descriptor() {
					this.setState({
						type: 'descriptor'
					});
				},
				submit() {
					console.log('asdf');
					var entity = XMap({
            _id: XObject.id(),
            type: this.refs.type.value,
            properties: [],
            data: [],
            object: this.refs.object.checked
          });
          if (this.state.type == 'content') {
          	entity.content = { type: 'text/line', content: this.typeInput.value }
          }
          else {
          	entity.descriptor = this.typeInput.value;
          }
          db.entities.push(entity);
          db.relationships.push(XObject.obj({
          	entities: [this.props.entity._id, entity._id],
          	directed: true,
          	internal: true
          }))
					this.props.onSubmit();
					return false;
				}
			}
		});
		this.state = {};
	}
	xRender() {
		return (
			<form onSubmit={this.actions.submit} className="form">
				<div>
					<input ref="object" type="checkbox" /> Object
				</div>
				<div>
					<input type="text" ref="type" placeholder="Type" />
				</div>
				{!this.state.type && <div>
					<button onClick={this.actions.content}>Content</button>
					<button onClick={this.actions.descriptor}>Descriptor</button>
				</div>}

				{this.state.type && <input ref={(input) => (this.typeInput = input) && input.focus()} type="text" placeholder={this.state.type} />}
				<input type="submit" />
			</form>
		);
	}
}

class StartEntity extends XComponent {
	constructor() {
		super({
			actions: {
				start(activity) {
          db.work_log_entries.push(XObject.obj({
            activity: {
              activity: activity,
              object: { entity: this.props.entity._id }
            },
            start: new Date(),
            subject: db.agency_users.find((user) => user.authKey == localStorage.getItem('authKey')).entity
          }));

					this.props.onSubmit();
				}
			}
		});
	}
	xRender() {
		return (
			<div>
				<div><button onClick={this.actions.start.bind('Development')}>Development</button></div>
			</div>
		);
	}
}

class EntityActionMenu extends XComponent {
	constructor() {
		super({
			actions: {
				add(e) {
					e.preventDefault();
					this.setState({
						submenu: 'add'
					});
				},
				start(e) {
					e.preventDefault();
					this.setState({
						submenu: 'start'
					});
				},
				back() {
					this.setState({
						submenu: null
					});
				},
				close() {
					this.props.onClose();
				}
			}
		});
		this.state = {};
	}
	renderSubmenu() {
		switch (this.state.submenu) {
			case 'add': return <AddEntityForm entity={this.props.entity} onSubmit={this.props.onClose} />;
			case 'start': return <StartEntity entity={this.props.entity} onSubmit={this.props.onClose} />;
		}
	}
	renderTitle() {
		if (!this.state.submenu) return 'Entity Actions';
		switch (this.state.submenu) {
			case 'add':
				return 'Add';
			case 'start':
				return 'Start';
		}
	}
	xRender() {
		return (
			<div className="entity-overview__menu">
				<div className="menu__header">
					{this.state.submenu && <button onClick={this.actions.back}>Back</button>}
					{this.renderTitle()}
					<button className="close" onClick={this.actions.close}>X</button>
				</div>
				{!this.state.submenu && <div>
					<div><a onClick={this.actions.add} href="#">Add</a></div>
					<div><a onClick={this.actions.start} href="#">Start</a></div>
				</div>}

				{this.state.submenu && <div>
					{this.renderSubmenu()}
				</div>}
			</div>
		);
	}
}

class _EntityName extends XComponent {
	constructor() {
		super({
			actions: {
				menu() {
					if (this.closeMenu) {
						this.closeMenu();
					}
					else {
						this.setState({
							showingMenu: true
						})
						this.closeMenu = () => {
							ReactDOM.unmountComponentAtNode(menuEl[0]);
							menuEl.remove()
							this.setState({
								showingMenu: false
							})
							delete this.closeMenu;
						}
						var menuEl = $('<div></div>');
						var el = $(this.refs.el);
						ReactDOM.render(<EntityActionMenu onClose={this.closeMenu} entity={this.props.entity} />, menuEl[0]);
						menuEl.appendTo('body');

						menuEl.css({
							position: 'absolute',
						});
						menuEl.css({
							left: el.offset().left - menuEl.outerWidth() + el.outerWidth(),
							top: el.offset().top + el.outerHeight()
						})

					}
				},
				done() {
					this.setState({
						menu: false
					})
				}
			}
		});
		this.state = {};
	}
	xRender() {
		return this.props.connectDropTarget(this.props.connectDragSource(
			<div className={classNames('name', {'showing-menu':this.state.showingMenu})}>
				<Link to={`/entities/${this.props.entity._id}`}>{Models.Entity.display(this.props.entity)}</Link>
				<button ref="el" className="add" onClick={this.actions.menu}>...</button>
				{this.state.menu && <EntityActionMenu entity={this.props.entity} onSubmit={() => this.setState({menu:false})} />}
			</div>
		));
	}
}

var EntityName = DragSource('entity', {
  beginDrag(props) {
    // Return the data describing the dragged item
    return {
    	entity: props.entity,
    	parent: props.parent,
    };
  },

  endDrag(props, monitor, component) {
    if (!monitor.didDrop()) {
      return;
    }

    // When dropped on a compatible target, do something
    const item = monitor.getItem();
    const dropResult = monitor.getDropResult();
    // console.log(props, component, dropResult)
    // CardActions.moveCardToList(item.id, dropResult.listId);
  }
}, (connect, monitor) => {
  return {
    // Call this function inside render()
    // to let React DnD handle the drag events:
    connectDragSource: connect.dragSource(),
    // You can ask the monitor about the current drag state:
    isDragging: monitor.isDragging()
  };
})(_EntityName);

EntityName = DropTarget('entity', {
  canDrop(props, monitor) {
  	return true;
  },

  hover(props, monitor, component) {
  },

  drop(props, monitor, component) {
    if (monitor.didDrop()) {
      // If you want, you can check whether some nested
      // target already handled drop
      return;
    }


    // Obtain the dragged item
    const item = monitor.getItem();
    // console.log(props, component, item);

    console.log('dropped on', Models.Entity.display(props.entity));
    console.log('dropped', Models.Entity.display(item.entity));
    console.log('from', Models.Entity.display(item.parent));

    if (item.parent) {
	    var rel = db.relationships.find((rel) => {
	    	return rel.entities[0] == item.parent._id && rel.entities[1] == item.entity._id
	    });
	    console.log(XStrip(rel));

	    if (rel.entities[1] != props.entity._id) {
		    rel.entities[0] = props.entity._id;
	    }

	    setTimeout(() => {
	    	overview.forceUpdate()
	    }, 10);

    }



    return {  };
  }
}, (connect, monitor) => {
  return {
    // Call this function inside render()
    // to let React DnD handle the drag events:
    connectDropTarget: connect.dropTarget(),
    // You can ask the monitor about the current drag state:
    isOver: monitor.isOver(),
    isOverCurrent: monitor.isOver({ shallow: true }),
    canDrop: monitor.canDrop(),
    itemType: monitor.getItemType()
  };
})(EntityName);



class EntityOverview extends XComponent {
	xRender() {
		var relationships = Models.Entity.relationships(this.props.entity, null, true).filter((rel) => rel.internal);
		var containers = relationships.filter((rel) => {
			var entity = Models.Entity.relatedEntity(this.props.entity, rel);
			if (entity.object) return true;
			return Models.Entity.relationships(entity, null, true).find((rel) => rel.internal);
		}).map((rel) => {
			return Models.Entity.relatedEntity(this.props.entity, rel);
		});

		var other = relationships.filter((rel) => {
			return !containers.find((entity) => entity._id == rel.entities[1]);
		}).map((rel) => {
			return Models.Entity.relatedEntity(this.props.entity, rel);
		});


		return (
			<div className={classNames('entity-overview', {object:this.props.entity.object})}>
				<EntityName parent={this.props.parent} entity={this.props.entity} />
				{containers.length > 0 && <div className="containers">
					{containers.map((object) => {
						return (
							<EntityOverview parent={this.props.entity} key={object._id} entity={object} />
						);
					})}
				</div>}

				{other.length > 0 && <div className="related">
					{other.map((entity) => {
						return (
							<div key={entity._id}><EntityName parent={this.props.entity} entity={entity} /></div>
						);
					})}
				</div>}
			</div>
		);
	}
}


var overview = null;
class Overview extends XComponent {
	componentDidMount() {
		overview = this;
	}
	xRender() {
		// var rootEntities = ['59c3779c18ce9200007aa485', '59c30b66aceeab00008c9694', '59c2cc1be31edc00009abf68'];
		return (
			<div className="overview">
				{this.props.entities.map((entity) => {
					return (
						<EntityOverview key={entity._id} entity={entity} />
					);
				})}
			</div>
		);
	}
}

Overview = DragDropContext(HTML5Backend)(Overview);

export { Overview };
