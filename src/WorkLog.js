import React from 'react';
import { XMap, XObject,/* XStrip,*/ XComponent } from './XObject';
import { db, Models, Collection } from './db';
import { PropertyField, EntitySelector } from './UI';
import juration from 'juration';


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
				},
				group() {
					var id = XObject.id();
					db.work_log_entry_groups.push(XMap({
						_id: id,
						entries: this.selected.map(e => e._id),
					}));
					for (var entry of this.selected) {
						entry.group = id;
					}
					this.selected = [];
					this.forceUpdate();
				}
			}
		});
		this.selected = [];
	}
	xRender() {
		return (
			<div className="work-log">
				<h1>Work Log</h1>
				<button onClick={this.actions.group}>Group</button>
				<ul>
					{db.work_log_entries.filter(entry => !entry.group).map(entry => {
						return (
							<li key={entry._id}>
								<input type="checkbox" checked={this.selected.includes(entry)} onClick={(e) => {!this.selected.includes(entry) ? this.selected.push(entry) : this.selected.remove(entry); this.forceUpdate()}} />
								<div>
									<label>Subject: </label>
									<PropertyField type="entity" object={entry} property="subject" />
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

				<h2>Groups</h2>
				<ul>
					{db.work_log_entry_groups.map(group => {
						return (
							<li>
								<div>
									<label>Description: </label>
									<PropertyField type="text" object={group} property="description" />
								</div>

								<div>
									<label>Time: </label>
									{juration.stringify(group.entries.map((id) => Collection.findById('work_log_entries', id)).reduce((time, entry) => time + (entry.end || new Date()).getTime() - entry.start.getTime(), 0)/1000)}
								</div>

								<div>
									<label>Time Override: </label>
									<PropertyField type="duration" object={group} property="timeOverride" />
								</div>

								<h3>Entries</h3>
								<ul>
								{group.entries.map((id) => Collection.findById('work_log_entries', id)).map(entry => {
									return (
							<li key={entry._id}>
								<div>
									<label>Subject: </label>
									<PropertyField type="entity" object={entry} property="subject" />
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
									<label>Activity: </label>
									<PropertyField type="text" object={entry} property="activity.activity" />
								</div>

								{entry.activity.object.entity && <div>
									<label>Object Entity: </label>
									<PropertyField type="entity" object={entry} property="activity.object.entity" />
								</div>}
							</li>

									)
								})}
								</ul>
							</li>
						);
					})}
				</ul>
			</div>
		);
	}
}
