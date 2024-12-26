import express from "express";
import mongoose from "mongoose";
import { EmployeeModel, EmployeeGrievancesTrack, AssignedwithTrackingDocument, Allotment, LeaveData, LeaveHistory, UserModel } from "../../Database/allModels";
import { ValidateEmployee } from "../../Validation/employeeValidation";
import bcrypt from "bcryptjs";
const router = express.Router();

router.delete('/delete-employee/:id', async (req, res) => {
  const { id } = req.params;

  // Validate the ID format
  const isValidObjectId = mongoose.Types.ObjectId.isValid(id);
  if (!isValidObjectId) {
    return res.status(400).json({ message: 'Invalid employee ID' });
  }

  try {
    // Attempt to delete the employee
    const deletedEmployee = await EmployeeModel.findByIdAndDelete(id);
    //console.log(deletedEmployee, id);

    if (!deletedEmployee) {
      //console.error('Employee not found with ID:', id);
      return res.status(404).json({ message: 'Employee not found' });
    }

    //console.log('Deleted Employee:', deletedEmployee);

    // Delete any associated allotment for the employee
    const deletedAllotments = await Allotment.deleteMany({ employee: id });

    //console.log('Deleted Allotments Count:', deletedAllotments.deletedCount);

    // Find related EmployeeGrievancesTrack document
    const grievancesTrack = await EmployeeGrievancesTrack.findOne({ employeeId: id });
    //console.log(grievancesTrack);
    if (grievancesTrack) {
      //console.log('Found GrievancesTrack:', grievancesTrack);

      const { grievanceCategories } = grievancesTrack;

      for (const category in grievanceCategories) {
        const grievanceIds = grievanceCategories[category];

        // Check if grievanceIds is an array
        if (!Array.isArray(grievanceIds)) {
          //console.warn(`Skipping non-array category: ${category}`);
          continue;
        }

        for (const grievanceId of grievanceIds) {
          try {
            // Delete documents in AssignedwithTrackingDocument referencing this grievance ID
            const deletedTrackingDocs = await AssignedwithTrackingDocument.deleteMany({
              referenceTrackingDocument: grievancesTrack._id,
              referenceGrievanceDocument: grievanceId,
            });
            //console.log(`Deleted ${deletedTrackingDocs.deletedCount} tracking documents for grievance ID: ${grievanceId}`);
          } catch (err) {
            //console.error(`Error deleting tracking documents for grievance ID: ${grievanceId}`, err);
          }
        }
      }

      // Delete the EmployeeGrievancesTrack document
      await EmployeeGrievancesTrack.findByIdAndDelete(grievancesTrack._id);
    }

    // Delete all records in LeaveHistory where employeeId matches
    const deletedLeaveHistory = await LeaveHistory.deleteMany({ employeeId: id });
    //console.log('Deleted LeaveHistory Count:', deletedLeaveHistory.deletedCount);

    // Delete all records in LeaveData where employeeId matches
    const deletedLeaveData = await LeaveData.deleteMany({ employeeId: id });
    //console.log('Deleted LeaveData Count:', deletedLeaveData.deletedCount);

    return res.status(200).json({
      message: 'Employee, related documents, and allotments deleted successfully',
      deletedAllotments: deletedAllotments.deletedCount,
    });
  } catch (error) {
    //console.error('Error deleting employee:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Update employee details route
router.put('/edit-employee/:id', async (req, res) => {
  try {
    const employeeId = req.params.id;
    const updateData = { ...req.body }; // Clone the request body to avoid direct mutation

    // Remove the `_id` field from updateData
    var tempFormData = updateData
    delete tempFormData._id;
    delete tempFormData.createdAt
    delete tempFormData.updatedAt
    delete tempFormData.__v

    // Validate the employee data using Joi
    await ValidateEmployee(tempFormData);

    // Check if the employee exists
    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found',
      });
    }

    // Update employee details while ensuring _id is not modified
    Object.keys(updateData).forEach((key) => {
      employee[key] = updateData[key];
    });

    // Save updated employee details to the database
    const updatedEmployee = await employee.save();

    // Return success response with updated employee data
    return res.status(200).json({
      status: 'success',
      message: 'Employee details updated successfully!',
      employee: updatedEmployee,
    });
  } catch (error) {
    if (error.isJoi) {
      // Joi validation error
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        details: error.details.map((detail) => detail.message), // Detailed validation errors
      });
    }

    // Generic error handling
    //console.error('Error updating employee:', error);
    return res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message || 'Internal server error',
    });
  }
});

// router for the attendance
router.get('/leave-data/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Fetch leave data for the employee
    let leaveData = await LeaveData.findOne({ employeeId });

    // Fetch employee creation date
    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const creationDate = new Date(employee.createdAt);
    const creationMonth = creationDate.toLocaleString('default', { month: 'short' });
    const creationYear = creationDate.getFullYear();

    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'short' });
    const currentYear = currentDate.getFullYear();

    // Define the quarters and months
    const quarters = {
      Q1: ["Jan", "Feb", "Mar"],
      Q2: ["Apr", "May", "Jun"],
      Q3: ["Jul", "Aug", "Sep"],
      Q4: ["Oct", "Nov", "Dec"]
    };

    // Determine the current quarter
    const currentQuarter = Object.keys(quarters).find(quarter =>
      quarters[quarter].includes(currentMonth)
    );

    // Generate all months for the current quarter
    const quarterMonths = quarters[currentQuarter];

    // Calculate extra leaves
    let extraLeaves = 0;

    // Start from the creation month and year
    let checkMonthYear = new Date(creationYear, new Date(Date.parse(creationMonth + " 1, " + creationYear)).getMonth(), 1);

    // End at the month before the current month
    let endMonthYear = new Date(currentYear, new Date().getMonth(), 0); // End of previous month

    while (checkMonthYear <= endMonthYear) {
      const monthStr = checkMonthYear.toLocaleString('default', { month: 'short' });
      const yearStr = checkMonthYear.getFullYear().toString();

      if (leaveData) {
        const existingMonth = leaveData.month.find(m => m.month === monthStr && m.year === yearStr);
        if (existingMonth) {
          extraLeaves += existingMonth.totalLeaveLeft;
        } else {
          extraLeaves += 2; // Default value if month data not found
        }
      } else {
        extraLeaves += 2; // Default value if no leave data exists
      }

      // Move to the next month
      checkMonthYear.setMonth(checkMonthYear.getMonth() + 1);
    }

    // If the creation date is greater than the end date, set extraLeaves to 0
    if (creationDate > endMonthYear) {
      //console.log("creationDate > endMonthYear");
      extraLeaves = 0;
    }

    // Create or update leave data document
    if (leaveData) {
      const leaveHistory = await LeaveHistory.findOne({ employeeId });
      if (leaveHistory) {
        const extraType = leaveHistory.leaveHistory.filter(leave => leave.type === 'extra').length;
        leaveData.extraLeaves = extraLeaves - extraType;
      } else {
        leaveData.extraLeaves = extraLeaves;
      }
      await leaveData.save();
    } else {
      leaveData = new LeaveData({
        employeeId,
        month: [],
        extraLeaves
      });
      await leaveData.save();
    }

    // Prepare filtered months with default values
    let filteredMonths = quarterMonths.map(month => ({
      month: month,
      year: currentYear.toString(),
      sickLeave: 1,
      casualLeave: 1,
      totalLeaveLeft: 2
    }));

    if (leaveData) {
      // If leave data exists, filter months based on actual leave data
      filteredMonths = quarterMonths.map(month => {
        const existingMonth = leaveData.month.find(m => m.month === month && m.year === currentYear.toString());
        if (existingMonth) {
          return existingMonth;
        } else {
          return {
            month: month,
            year: currentYear.toString(),
            sickLeave: 1,
            casualLeave: 1,
            totalLeaveLeft: 2
          };
        }
      });
    }
    //console.log(filteredMonths, extraLeaves);
    res.json({ leaveData: filteredMonths, extraLeaves: leaveData ? leaveData.extraLeaves : 0 });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/apply-leave', async (req, res) => {
  try {
    const { employeeId, date, type, purpose } = req.body;
    //console.log(employeeId, date, type, purpose);
    // Parse the leave date and get current date
    const leaveDate = new Date(date);
    const currentDate = new Date();
    // currentDate.setHours(0, 0, 0, 0); // Set time to midnight for accurate comparison

    if (type === 'sick') {
      const previousDate = new Date(currentDate);
      previousDate.setDate(currentDate.getDate() - 1);
      //.log(leaveDate, previousDate);
      // console.log(
      //   leaveDate.getFullYear(),
      //   previousDate.getFullYear(),
      //   leaveDate.getMonth(),
      //   previousDate.getMonth(),
      //   leaveDate.getDate(),
      //   previousDate.getDate()
      // );
      if (
        leaveDate.getFullYear() !== previousDate.getFullYear() ||
        leaveDate.getMonth() !== previousDate.getMonth() ||
        leaveDate.getDate() !== previousDate.getDate()
      ) {
        return res
          .status(400)
          .json({ message: 'Sick leave must be applied for the previous day.' });
      }
    }

    // Conditions for 'casual' and 'extra' leave
    if (type === 'casual' || type === 'extra') {
      const minDate = new Date(currentDate);
      minDate.setDate(minDate.getDate() + 3);

      const maxDate = new Date(currentDate);
      maxDate.setDate(maxDate.getDate() + 15);

      if (leaveDate < minDate || leaveDate > maxDate) {
        return res
          .status(400)
          .json({
            message:
              'Casual and extra leave must be applied for a date between 3 and 15 days from today.',
          });
      }
    }

    // Parse the leave date to get month and year
    const leaveMonth = leaveDate.toLocaleString('default', { month: 'short' });
    const leaveYear = leaveDate.getFullYear().toString();

    // Fetch leave data for the employee
    let leaveData = await LeaveData.findOne({ employeeId });

    if (!leaveData) {
      return res
        .status(404)
        .json({ message: 'Leave data not found for employee' });
    }

    // Check if the leave month and year exist in leaveData
    let monthData = leaveData.month.find(
      (m) => m.month === leaveMonth && m.year === leaveYear
    );
    let firstTime = false;
    if (!monthData) {
      // If the month data doesn't exist, create it with default values
      monthData = {
        month: leaveMonth,
        year: leaveYear,
        sickLeave: 1,
        casualLeave: 1,
        totalLeaveLeft: 2,
      };
      firstTime = true;
    }

    // Check if the leave for the specified date already exists in the leave history
    let leaveHistory = await LeaveHistory.findOne({ employeeId });

    if (leaveHistory) {
      const existingLeave = leaveHistory.leaveHistory.find(
        (leave) =>
          leave.date.toDateString() === leaveDate.toDateString() &&
          leave.type === type
      );

      if (existingLeave) {
        if (existingLeave.approved === 'NOT YET APPROVED') {
          return res
            .status(400)
            .json({
              message:
                'On the selected date, leave has already been applied and is waiting for admin approval.',
            });
        } else if (existingLeave.approved === 'APPROVED') {
          return res
            .status(400)
            .json({
              message: 'Leave already applied for the selected date.',
            });
        }
      }
    }

    // Update the leave count based on the leave type
    if (type === 'sick' && monthData.sickLeave > 0) {
      monthData.sickLeave -= 1;
      monthData.totalLeaveLeft -= 1;
    } else if (type === 'casual' && monthData.casualLeave > 0) {
      monthData.casualLeave -= 1;
      monthData.totalLeaveLeft -= 1;
    } else if (type === 'extra' && leaveData.extraLeaves > 0) {
      //console.log('going inside');
      leaveData.extraLeaves -= 1;
      //console.log(leaveData.extraLeaves);
    } else {
      return res.status(400).json({ message: 'Not enough leave balance' });
    }

    if (firstTime) {
      leaveData.month.push(monthData);
    }

    // Save the updated leave data
    await leaveData.save();
    //console.log('Leave applied successfully....');

    // If leave history does not exist, create a new document
    if (!leaveHistory) {
      leaveHistory = new LeaveHistory({ employeeId, leaveHistory: [] });
    }

    // Add the leave application to the leave history
    leaveHistory.leaveHistory.push({
      date: leaveDate,
      type,
      purpose,
    });

    // Save the updated leave history
    await leaveHistory.save();

    res.json({ message: 'Leave applied successfully' });
  } catch (error) {
    //console.log(error.message);
    res.status(500).json({ message: 'Server error', error });
  }
});
router.get('/leave-history/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const leaveHistory = await LeaveHistory.findOne({ employeeId }).populate('employeeId');

    if (!leaveHistory) {
      return res.status(200).json({ message: 'Leave history not found for employee' });
    }

    res.json(leaveHistory.leaveHistory);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

router.put('/cancel-leave/:employeeId/:leaveId', async (req, res) => {
  try {
    const { employeeId, leaveId } = req.params;

    // Find the leave data for the given employee
    const leaveHistory = await LeaveHistory.findOne({ employeeId });

    if (!leaveHistory) {
      return res.status(404).json({ message: 'Leave history not found' });
    }

    // Find the specific leave entry in the leave history
    const leave = leaveHistory.leaveHistory.id(leaveId);

    if (!leave) {
      return res.status(404).json({ message: 'Leave not found' });
    }
    if (leave.approved !== 'NOT YET APPROVED') {
      if (leave.approved === 'APPROVED') {
        return res.status(409).json({ message: 'Cannot cancel an approved leave.Please reload to see the updated Status' });
      } else {
        return res.status(409).json({ message: 'Cannot cancel a rejected leave.Please reload to see the updated Status' });
      }
    }
    const { type, date } = leave;
    // Remove the leave from the leaveHistory array
    leaveHistory.leaveHistory = leaveHistory.leaveHistory.filter(
      (entry) => entry._id.toString() !== leaveId
    );
    await leaveHistory.save();

    // Find and update the leave data for the given employee
    const leaveData = await LeaveData.findOne({ employeeId });

    if (!leaveData) {
      return res.status(404).json({ message: 'Leave data not found' });
    }

    const leaveMonth = new Date(date).toLocaleString('default', { month: 'short' });
    const leaveYear = new Date(date).getFullYear().toString();

    // Locate the specific month's data to update
    const monthData = leaveData.month.find(
      (m) => m.month === leaveMonth && m.year === leaveYear
    );

    if (!monthData) {
      return res.status(404).json({ message: 'Month data not found for leave' });
    }

    // Update leave balances based on the leave type
    if (type === 'sick') {
      monthData.sickLeave += 1;
      monthData.totalLeaveLeft += 1;
    } else if (type === 'casual') {
      monthData.casualLeave += 1;
      monthData.totalLeaveLeft += 1;
    } else if (type === 'extra') {
      leaveData.extraLeaves += 1;
    }

    await leaveData.save();

    res.json({ message: 'Leave canceled and balances updated successfully' });
  } catch (error) {
    //console.error('Error in cancel-leave:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/getAllHistoryOfAllEmployees', async (req, res) => {
  try {
    const leaveHistory = await LeaveHistory.find().populate('employeeId', 'name'); // Populate to get employee names
    //console.log("leaveHistory",leaveHistory);
    const notApprovedLeaves = leaveHistory.reduce((acc, curr) => {
      const notApproved = curr.leaveHistory.filter(leave => leave.approved === "NOT YET APPROVED");
      if (notApproved.length > 0) {
        acc.push(...notApproved.map(leave => ({
          ...leave.toObject(),
          employeeName: curr.employeeId.name,
          employeeId: curr.employeeId._id
        })));
      }
      return acc;
    }, []);
    //console.log("NOT YET APPROVED",notApprovedLeaves);
    const approvedLeaves = leaveHistory.reduce((acc, curr) => {
      const approved = curr.leaveHistory.filter(leave => leave.approved === "APPROVED");
      //console.log(approved.length);
      if (approved.length > 0) {
        acc.push(...approved.map(leave => ({
          ...leave.toObject(),
          employeeName: curr.employeeId.name,
          employeeId: curr.employeeId._id
        })));
      }
      return acc;
    }, []);
    //console.log("APPROVED", approvedLeaves);
    const rejectedLeaves = leaveHistory.reduce((acc, curr) => {
      const rejected = (curr.leaveHistory || []).filter(leave => leave.approved === "REJECTED");
      //console.log("rejected",rejected);
      if (rejected.length > 0) {
        //console.log(rejected.length);

        //console.log(curr.employeeId.name,curr.employeeId._id);

        acc.push(...rejected.map(leave => ({
          ...leave,
          employeeName: curr.employeeId.name,
          employeeId: curr.employeeId._id,
        })));
      }
      return acc;
    }, []);
    //console.log(rejectedLeaves);
    res.json({ notApprovedLeaves, approvedLeaves, rejectedLeaves });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

router.put('/approve-leave/:leaveId/:employeeId', async (req, res) => {
  try {
    const { leaveId, employeeId } = req.params;
    const leaveHistory = await LeaveHistory.findOne({ employeeId });

    if (!leaveHistory) {
      return res.status(404).json({ message: 'Leave history not found for this employee' });
    }

    const leave = leaveHistory.leaveHistory.id(leaveId);
    if (!leave) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    leave.approved = "APPROVED";

    await leaveHistory.save();
    res.json({ message: 'Leave approved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

router.put('/reject-leave/:leaveId/:employeeId', async (req, res) => {
  try {
    const { leaveId, employeeId } = req.params;
    const leaveHistory = await LeaveHistory.findOne({ employeeId });

    if (!leaveHistory) {
      return res.status(404).json({ message: 'Leave not found' });
    }

    const leave = leaveHistory.leaveHistory.id(leaveId);
    leave.approved = "REJECTED";
    const { type, date } = leave;

    //leaveHistory.leaveHistory.pull({ _id: leaveId });
    await leaveHistory.save();


    let leaveData = await LeaveData.findOne({ employeeId });

    const leaveMonth = new Date(date).toLocaleString('default', { month: 'short' });
    const leaveYear = new Date(date).getFullYear().toString();

    let monthData = leaveData.month.find(m => m.month === leaveMonth && m.year === leaveYear);

    if (type === 'sick') {
      monthData.sickLeave += 1;
      monthData.totalLeaveLeft += 1;
    } else if (type === 'casual') {
      monthData.casualLeave += 1;
      monthData.totalLeaveLeft += 1;
    } else if (type === 'extra') {
      leaveData.extraLeaves += 1;
    }

    await leaveData.save();

    res.json({ message: 'Leave rejected and balance updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
})

router.put('/update-password/:id', async (req, res) => {
  const { password } = req.body;
  //console.log(password);

  try {
    const employee = await EmployeeModel.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    employee.password = password
    await employee.save();

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    //console.error('Error updating password:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.get('/profile/:id', async (req, res) => {
  try {
    const userId = req.params.id;

    // Attempt to find user in EmployeeModel
    let user = await EmployeeModel.findById(userId).select('-password');

    if (!user) {
      //console.log("Not an employee");

      // If not found in EmployeeModel, search in UserModel
      user = await UserModel.findById(userId).select('-password');
    }

    if (!user) {
      // If not found in both models, return 404
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the found user
    res.json(user);
  } catch (error) {
    //console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
