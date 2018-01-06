import React, { Component } from 'react';
import { XComponent, XObject, XMap, XStrip } from './XObject';
import { db, Models, Collection } from './db';
import classNames from 'classnames';

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


