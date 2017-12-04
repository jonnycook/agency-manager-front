import React from 'react';
import { XMap, XObject, XStrip, XComponent } from './XObject';
import { db, Models, Collection } from './db';
import { PropertyField, EntitySelector } from './UI';
import juration from './juration';
import _ from 'lodash';
import { WorkPeriodHelper } from './WorkPeriod';

export class Work extends XComponent {
	xRender() {
		// var helper = new WorkPeriodHelper

		var totalTime = 0;
		var totalTimeLeft = 0;
		var totalAllocation = 0;


		var workPeriods = [];
		var endDate;// = db.work_periods[0].endDate.beginningOfDay();

		for (var workPeriod of db.work_periods) {
			if (workPeriod.endDate && new Date().isBetween(workPeriod.startDate, workPeriod.endDate) || new Date().isAfter(workPeriod.dateDate)) {
				workPeriods.push(workPeriod);
				if (!endDate || workPeriod.endDate && workPeriod.endDate.isAfter(endDate)) {
					endDate = workPeriod.endDate;
				}
			}
		}
		if (endDate) {
			endDate = endDate.beginningOfDay();
		}

		console.log(XStrip(workPeriods));

		for (var workPeriod of workPeriods) {
			if (workPeriod.finished) {
				totalTime += workPeriod.timeAllocation;
			}
			else {
				var helper = new WorkPeriodHelper(workPeriod);
				var t = helper.totalTime(Collection.findById('entities', workPeriod.baseEntity)).totalTime;
				totalTime += t;
			}
			totalAllocation += workPeriod.timeAllocation;
		}




		var date = new Date().beginningOfDay();

		var workHoursLeft = 0;
		var weekDayWorkHoursLeft = 0;
		var hoursPerDay = 8;

		while (true) {
			workHoursLeft += hoursPerDay;
			if (date.getDay() != 0 && date.getDay() != 6) {
				weekDayWorkHoursLeft += hoursPerDay;
			}
			if (date.format('{yyyy}-{MM}-{dd}') == endDate.format('{yyyy}-{MM}-{dd}')) break;
			date.addDays(1);
		}


		return (
			<div>
				<div>
					{juration.stringify(totalTime)}/{juration.stringify(totalAllocation)} ({juration.stringify(totalAllocation - totalTime)} left)
				</div>
				<div>

					All Work Hours Left: {workHoursLeft}; Week Day Work Hours: {weekDayWorkHoursLeft}
					
				</div>
			</div>
		);
	}
}