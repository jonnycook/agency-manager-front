import React from 'react';
import { /*XMap, */XObject,/* XStrip,*/ XComponent } from './XObject';
import { db, Models, Collection } from './db';
import { PropertyField, EntitySelector } from './UI';


import _ from 'lodash';

export class WorkLog extends XComponent {
	constructor() {
		super({
			actions: {
				addIssue() {
					db.issues.push({
						_id: XObject.id(),
						createdAt: new Date()
					});
				},
				delete(issue) {
					Collection.removeDocument('issues', issue);
				},
				done(issue) {
					issue.completed = true;
				}
			}
		});
	}
	xRender() {
		return (
			<div className="work-log">
				<h1>Work Log</h1>
				<ul>
					{db.work_log_entries.map(entry => {
						return (
							<li key={entry._id}>
								<div>
									<label>Subject: </label>
									<PropertyField type="entity" object={entry} property="subject" />
								</div>
								<div>
									<label>Start: </label>
									<PropertyField type="date" object={entry} property="start" />
								</div>
								<div>
									<label>End: </label>
									<PropertyField type="date" object={entry} property="end" />
								</div>
								<div>
									<label>Activity: </label>
									<PropertyField type="text" object={entry} property="activity.activity" />
								</div>

								{entry.activity.object.entity && <div>
									<label>Object Entity: </label>
									<PropertyField type="entity" object={entry} property="activity.object.entity" />
								</div>}
							</li>
						);
					})}
				</ul>
			</div>
		);
	}
}
