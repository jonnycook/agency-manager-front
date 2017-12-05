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
				delete(entry) {
					if (entry.group) {
						var group = Collection.findById('work_log_entry_groups', entry.group);
						group.entries.splice(group.entries.indexOf(entry._id), 1);
					}
					Collection.removeDocument('work_log_entries', entry);
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
				},
				unGroup(entry) {
					if (entry.group) {
						var group = Collection.findById('work_log_entry_groups', entry.group);
						group.entries.splice(group.entries.indexOf(entry._id), 1);
						delete entry.group;
					}
				},
				deleteGroup(group) {
					for (var id of group.entries) {
						delete Collection.findById('work_log_entries', id).group;
					}
					Collection.removeDocument('work_log_entry_groups', group);
				},
				toggleEntries() {
					this.setState({
						showEntries: !this.state.showEntries
					})
				}
			}
		});
		this.state = {};
		this.selected = [];
	}
	xRender() {
		    var authKey = localStorage.getItem('authKey');
    var user = db.agency_users.find((user) => user.authKey == authKey);

		return (
			<div className="work-log">
				<h1>Work Log</h1>
				{/*<button onClick={this.actions.group}>Group</button>*/}
				<ul>
					{db.work_log_entries.filter(entry => !entry.group && !entry.invoice && entry.subject == user.entity).map(entry => {
						return (
							<li key={entry._id}>
								{/*<input type="checkbox" checked={this.selected.includes(entry)} onClick={(e) => {!this.selected.includes(entry) ? this.selected.push(entry) : this.selected.remove(entry); this.forceUpdate()}} />*/}
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
									<label>Activity: </label>
									<PropertyField type="text" object={entry} property="activity.activity" />
								</div>

								{entry.activity.object.entity && <div>
									<label>Object Entity: </label>
									<PropertyField type="entity" object={entry} property="activity.object.entity" />
								</div>}

								<button onClick={this.actions.delete(entry)}>Delete</button>
							</li>
						);
					})}
				</ul>

				{/*<h2>Groups</h2>
				<ul>
					{db.work_log_entry_groups.map(group => {
						return (
							<li key={group._id}>
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
								{group.timeOverride && <div>
									<label>Time Override Explanation: </label>
									<PropertyField type="text" object={group} property="timeOverrideExplanation" />
								</div>}

								<h3 onClick={this.actions.toggleEntries}>Entries</h3>
								{this.state.showEntries && <ul>
								{group.entries.map((id) => Collection.findById('work_log_entries', id)).map(entry => {
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
												<label>Activity: </label>
												<PropertyField type="text" object={entry} property="activity.activity" />
											</div>

											{entry.activity.object.entity && <div>
												<label>Object Entity: </label>
												<PropertyField type="entity" object={entry} property="activity.object.entity" />
											</div>}

											<button onClick={this.actions.unGroup(entry)}>Ungroup</button>
										</li>

									)
								})}
								</ul>}

								<button onClick={this.actions.deleteGroup(group)}>Delete</button>
							</li>
						);
					})}
				</ul>*/}
			</div>
		);
	}
}
