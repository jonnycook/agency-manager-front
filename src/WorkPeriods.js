import React from 'react';
import { XMap, XObject, XStrip, XComponent } from './XObject';
import { db, Models, Collection } from './db';
import { PropertyField, EntitySelector } from './UI';
import juration from 'juration';
import _ from 'lodash';
import { Link } from 'react-router-dom'



export class WorkPeriods extends XComponent {
	constructor() {
		super({
			actions: {
				deleteWorkPeriod(workPeriod) {
					db.work_periods.splice(db.work_periods.indexOf(workPeriod), 1);
				},
				addWorkPeriod() {
					db.work_periods.push(XObject.obj());
				}
			}
		});
	}
	xRender() {
		return (
			<div>
				<ul>
					{db.work_periods.map((workPeriod) => {
						return (
							<li key={workPeriod._id}>
								<Link to={`/work-periods/${workPeriod._id}`}>{workPeriod._id}</Link>
								<button onClick={this.actions.deleteWorkPeriod.bind(workPeriod)}>Delete</button>
							</li>
						);
					})}
				</ul>
				<button onClick={this.actions.addWorkPeriod}>Add</button>
			</div>
		);
	}
}