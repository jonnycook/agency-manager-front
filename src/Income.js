import React from 'react';
import { XMap, XObject,/* XStrip,*/ XComponent } from './XObject';
import { db, Models, Collection } from './db';
import { PropertyField, EntitySelector } from './UI';
import _ from 'lodash';

export class Income extends XComponent {
	constructor() {
		super({
			actions: {
				add() {
					db.income.push(XMap({
						_id: XObject.id()
					}));
				},
				addBreakdownEl(income) {
					if (!income.breakdown) {
						income.breakdown = XMap([]);
					}
					income.breakdown.push(XMap({_id: XObject.id()}));
				},
				removeBreakdownEl(income, el) {
					income.breakdown.splice(income.breakdown.findIndex(el => el._id === el._id), 1);
				},
				addAllocationEl(income) {
					if (!income.allocation) {
						income.allocation = XMap([]);
					}
					income.allocation.push(XMap({_id: XObject.id()}));
				},
				removeAllocationEl(income, el) {
					income.allocation.splice(income.allocation.findIndex(el => el._id === el._id), 1);
				},
				delete(income) {
					Collection.removeDocument('income', income);
				}
			}
		});
	}
	total(list) {
		return (list || []).reduce((total, el) => parseInt(el.amount) + total, 0)
	}
	xRender() {
		return (
			<div className="income">
				<h1>Income</h1>
				<ul>
					{db.income.map(income => {
						return (
							<li key={income._id}>
								<div className="field">
									<span className="name">From</span>
									<PropertyField type="entity" object={income} property="from" />
								</div>
								<div className="field">
									<span className="name">Amount</span>
									<PropertyField type="text" object={income} property="amount" />
								</div>
								<div className="field">
									<span className="name">Description</span>
									<PropertyField type="text" object={income} property="description" />
								</div>
								<div className="field">
									<span className="name">Invoice Sent Date</span>
									<PropertyField type="date" object={income} property="invoiceSentDate" />
								</div>
								<div className="field">
									<span className="name">Money Received Date</span>
									<PropertyField type="date" object={income} property="moneyReceivedDate" />
								</div>

								<div className="field">
									<span className="name">Breakdown</span>
									<ul>
										{(income.breakdown || []).map((el) => {
											return (
												<li key={el._id}>
													<div className="field">
														<span className="name">Recipient</span>
														<PropertyField type="entity" object={el} property="recipient" />
													</div>
													<div className="field">
														<span className="name">Amount</span>
														<PropertyField type="text" dataType="int" object={el} property="amount" />
													</div>
													<button onClick={this.actions.removeBreakdownEl(income, el)}>Remove</button>
												</li>
											);
										})}
											<li>
												Total: {this.total(income.breakdown)} {this.total(income.breakdown) != income.amount ? `(${income.amount - this.total(income.breakdown)})` : ''}
											</li>
									</ul>
									<button onClick={this.actions.addBreakdownEl(income)}>Add</button>
								</div>

								<div className="field">
									<span className="name">Allocation</span>
									<ul>
										{(income.allocation || []).map((el) => {
											return (
												<li key={el._id}>
													<div className="field">
														<span className="name">Recipient</span>
														<PropertyField type="entity" object={el} property="recipient" />
													</div>
													<div className="field">
														<span className="name">Amount</span>
														<PropertyField type="text" dataType="int" object={el} property="amount" />
													</div>
													<button onClick={this.actions.removeAllocationEl(income, el)}>Remove</button>
												</li>
											);
										})}
											<li>
												Total: {this.total(income.allocation)} {this.total(income.allocation) != income.amount ? `(${income.amount - this.total(income.allocation)})` : ''}
											</li>
									</ul>
									<button onClick={this.actions.addAllocationEl(income)}>Add</button>
								</div>
								<button onClick={this.actions.delete(income)}>Delete</button>
							</li>
						);
					})}
				</ul>
				<button onClick={this.actions.add}>Add</button>
			</div>
		);
	}
}
