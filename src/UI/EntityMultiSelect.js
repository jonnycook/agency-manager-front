import React, { Component } from 'react';
import { XComponent, XObject, XMap, XStrip } from '../XObject';
import { db, Models, collections } from '../db';
import { PropertyField } from '../UI';
import { Overview } from '../Overview';



export class EntityMultiSelect extends XComponent {
	constructor() {
		super();
		this.state = {
			baseEntity: '59c3779c18ce9200007aa485',
			entities: [
				'5a1203bcb1fa100000f0e22b',
				'5a3ad2452a9d960000be2bcc',
			].map(collections.entities.findById)
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
		let entities = this.state.entities;

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

		return (
			<div>
				<PropertyField object={this.stateSetter} property="baseEntity" type="entity" />
				{this.state.baseEntity && <Overview
					selectable={true}
					selected={entities}
					onSelected={(entity) => {
						this.setState({
							entities: this.state.entities.concat(entity),
						});
					}}
					onDeselected={(entity) => {
						this.setState({
							entities: this.state.entities.filter((e) => e != entity),
						});
					}}
					onCreate={(entity) => {
						console.log(entity);
					}}

					entities={[collections.entities.findById(this.state.baseEntity)]}
					/>}

				<Overview
					entities={rootEntities}
					filter={resolvedEntities} />
			</div>
		);
	}
}