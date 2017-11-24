import React from 'react';
import { XMap, XObject, XStrip, XComponent } from './XObject';
import { db, Models, Collection } from './db';
import { PropertyField, EntitySelector } from './UI';
import juration from './juration';
import _ from 'lodash';
import { Link } from 'react-router-dom'

export class WorkDays extends XComponent {
	constructor() {
		super({
			actions: {
				delete(workDay) {
					db.work_days.splice(db.work_days.indexOf(workDay), 1);
				},
				add() {
					db.work_days.push(XObject.obj());
				}
			}
		})
	}
	xRender() {
		return (
			<div>
				<ul>
					{db.work_days.map((workDay) => {
						return (
							<li key={workDay._id}>
								<Link to={`/work-days/${workDay._id}`}>{workDay.begin ? workDay.begin.toString() : '(none)'}</Link>
								<button onClick={this.actions.delete.bind(workDay)}>Delete</button>
							</li>
						);
					})}
				</ul>
				<button onClick={this.actions.add}>Add</button>
			</div>
		);
	}
}