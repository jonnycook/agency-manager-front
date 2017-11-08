import React from 'react';
import { XMap, XObject, XComponent, XStrip } from './XObject';
import { PropertyField } from './UI';
import { db } from './db';


export class BatchEntityCreator extends XComponent {
	constructor() {
		super({
			actions: {
				create() {
					var values = this.refs.propertyValues.value.split(/\n+/);
					for (var value of values) {
						var entity = XObject.obj({
							type: this.refs.type.value,
							data: [],
							properties: [
								XObject.obj({
									name: this.refs.propertyName.value,
									value: value,
									type: 'text/line'
								})
							]
						});

						var relationship = XObject.obj({
							entities: [this.parentEntity, entity._id],
							directed: true
						});

						db.entities.push(entity);
						db.relationships.push(relationship);
						// console.log(XStrip(relationship), XStrip(entity));
					}
				}
			}
		});
	}
	xRender() {
		return (
			<div>
				<PropertyField object={this} property="parentEntity" type="entity" />
				<input type="text" ref="type" placeholder="Type" />
				<input type="text" ref="propertyName" placeholder="Property Name" />
				<textarea ref="propertyValues"></textarea>
				<button onClick={this.actions.create}>Create</button>
			</div>
		);
	}
}