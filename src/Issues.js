import React from 'react';
import { /*XMap, */XObject,/* XStrip,*/ XComponent } from './XObject';
import { db, Models, Collection } from './db';
import { PropertyField, EntitySelector } from './UI';


import _ from 'lodash';

export class Issues extends XComponent {
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
	groupedIssues() {
		var grouped = {};
		// db.issues.length;
		for (var issue of db.issues) {
			if (issue.completed) continue;
			if (!grouped[issue.entity]) {
				grouped[issue.entity] = [];
			}
			grouped[issue.entity].push(issue);
		}
		return _.map(grouped, (value, key) => (
			{
				entity: Collection.findById('entities', key),
				issues: value			
			}
		));
	}
	xRender() {
		return (
			<div className="issues">
				<h1>Issues</h1>
				{this.groupedIssues().map(entry => (
					<div className="issues__group" key={entry.entity ? entry.entity._id : 'none'}>
						<h2>{Models.Entity.display(entry.entity)}</h2>
						<ul>
							{entry.issues.map(issue => {
								return (
									<li key={issue._id}>
										<div className="issues__issue item">
											<div className="issue__description">
												Description: 
												<PropertyField object={issue} property="description" />
											</div>
											<div>
												<span className="label">Entity:</span>
												<EntitySelector set={(value) => issue.entity = value} entity={() => issue.entity} />
											</div>
											<button onClick={this.actions.done(issue)}>Done</button>
											<button onClick={this.actions.delete(issue)}>Delete</button>
										</div>
									</li>
								);
							})}
						</ul>

					</div>
				))}
				<button onClick={this.actions.addIssue}>Add</button>
			</div>
		);
	}
}
