import React, { Component } from 'react';
import { XComponent, XObject, XMap, XStrip } from '../XObject';
import { db, Models, collections } from '../db';
import { PropertyField } from '../UI';
import { Overview } from '../Overview';


export class EntityContents extends XComponent {
	constructor() {
		super();
		this.state = {
			baseEntity: null,
		};
		this.stateSetter = new Proxy({}, {
			set: (obj, prop, value) => {
				this.setState({[prop]: value});
				return true;
			},
			get: (obj, prop) => {
				return this.state[prop];
			}
		});

	}
	xRender() {
		let entities = Models.Entity.queryRelatedEntities(this.props.entity, {
			startPoint: false
		});
		console.log(entities);

		let resolvedEntities = {};
		let rootEntities = {};
		for (let entity of entities) {
			resolvedEntities[entity._id] = true;

			let currentEntity = entity;
			do {
				let parentEntity = Models.Entity.queryRelatedEntity(currentEntity, {
					startPoint: true
				});
				if (parentEntity) {
					resolvedEntities[parentEntity._id] = true;
					currentEntity = parentEntity;
				}
				else {
					rootEntities[currentEntity._id] = true;
					break;
				}
			} while (true);
		}

		resolvedEntities = Object.keys(resolvedEntities).map(collections.entities.findById);
		rootEntities = Object.keys(rootEntities).map(collections.entities.findById);

		const addEntity = (entity) => {
			db.relationships.push(XObject.obj({
				entities: [this.props.entity._id, entity._id],
				directed: true
			}));
		};

		const removeEntity = (entity) => {
			let rel = db.relationships.find((rel) => rel.entities[0] == this.props.entity._id && rel.entities[1] == entity._id);
			db.relationships.splice(db.relationships.indexOf(rel), 1);
		};

		return (
			<div>
				<PropertyField object={this.stateSetter} property="baseEntity" type="entity" />
				{this.state.baseEntity && <Overview
					selectable={true}
					selected={entities}
					onSelected={addEntity}
					onDeselected={removeEntity}
					onCreate={addEntity}
					entities={[collections.entities.findById(this.state.baseEntity)]} />}

				<Overview
					entities={rootEntities}
					filter={resolvedEntities} />
			</div>
		);
	}
}