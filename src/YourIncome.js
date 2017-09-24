import React from 'react';
import { XMap, XObject, XStrip, XComponent } from './XObject';
import { db, Models, Collection } from './db';
import { PropertyField, EntitySelector } from './UI';
import _ from 'lodash';

export class YourIncome extends XComponent {
	constructor() {
		super({
			actions: {

			}
		});
	}
	xRender() {
		var user = db.agency_users.find({ authKey: localStorage.getItem('authKey') });
		console.log(XStrip(user));
		return (
			<div className="your-income">
				<h1>Your Income</h1>
				<ul>
					{db.income.filter((income) => {
						return income.breakdown.find({ recipient: user.entity })
					}).map(income => {
						return (
							<li key={income._id}>
								<div>
									From: <PropertyField type="entity" object={income} property="from" readonly={true} />
								</div>
								<div>
									Description: <PropertyField type="text" object={income} property="description" readonly={true} />
								</div>

								<div>
									Invoice Sent Date: <PropertyField type="date" object={income} property="invoiceSentDate" readonly={true} />
								</div>

								<div>
									Money Received From Client Date: <PropertyField type="date" object={income} property="moneyReceivedDate" readonly={true} />
								</div>

								<div>
									Date You Received the Money: <PropertyField type="date" object={income} property={`receiptReceivedDate.${user.entity}`} />
								</div>

								<div>
									Amount: {income.breakdown.find({ recipient: user.entity }).amount}
								</div>

								{income.allocation.find({ recipient: user.entity }) &&
								<div>
									Actual Amount: {income.allocation.find({ recipient: user.entity }).amount}
								</div>}
							</li>
						);
					})}
				</ul>
			</div>
		);
	}
}
