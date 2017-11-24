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
		for (var workPeriod of db.work_periods) {
			var helper = new WorkPeriodHelper(workPeriod);
			var t = helper.totalTime(Collection.findById('entities', workPeriod.baseEntity)).totalTime;
			totalTime += t;
			totalAllocation += workPeriod.timeAllocation;
		}

		var endDate = db.work_periods[0].endDate.beginningOfDay();

		var date = new Date().beginningOfDay();
		// date.addDays(1);

		var workHoursLeft = 0;
		var weekDayWorkHoursLeft = 0;

		while (true) {
			workHoursLeft += 8;
			if (date.getDay() != 0 && date.getDay() != 6) {
				weekDayWorkHoursLeft += 8;
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

					All Work Hours: {workHoursLeft}; Week Day Work Hours: {weekDayWorkHoursLeft}
					
				</div>
			</div>
		);
	}
}