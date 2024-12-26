const express = require('express');
import { Allotment, EmployeeModel, AC, LetterRequest, EmployeeGrievancesTrack, AssignedwithTrackingDocument } from '../../Database/allModels'; // Import Allotment model
const router = express.Router();

// Add new allotment route
router.post('/add-allotment', async (req, res) => {
  try {
    const { employeeId, acId } = req.body;
    //console.log(employeeId, acId);
    
    // Check if the employee exists
    const employee = await EmployeeModel.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    // Check if the AC exists
    const ac = await AC.findById(acId);
    //console.log(ac);
    if (!ac) {
      return res.status(404).json({ message: 'AC (Assembly Constituency) not found' });
    }

    // Check if the employee has already been assigned to the any AC
    const existingAllotment = await Allotment.findOne({ employee: employeeId});
    //console.log("n",existingAllotment);
    if(existingAllotment){
      const existingac = await AC.findById(existingAllotment.ac);
      return res.status(403).json({
        message: `EMPLOYEE '${employee.name}' HAS ALREADY BEEN ASSIGNED WITH ${existingac.name}`
      });
    }
    //console.log("going to");
    // Create new allotment
    const newAllotment = new Allotment({
      employee: employeeId,
      ac: ac._id
    });

    // Save to database
    await newAllotment.save();

    // Return success response
    return res.status(200).json({
      status: 'success',
      message: 'Allotment created successfully!',
      allotment: newAllotment
    });

  } catch (error) {
    // Handle validation or other errors
    //console.log(error.message);
    return res.status(error.statusCode || 500).json({
      message: error.message || 'Internal server error'
    });
  }
});

// Get all employees route
router.get('/getAll-employees', async (req, res) => {
  try {
    // Fetch all employees from the database excluding the password field
    const employees = await EmployeeModel.find({}, { password: 0 });

    // Check if employees are found
    if (employees.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No employees Added',
        employees: []
      });
    }

    // Return success response with employee data
    return res.status(200).json({
      status: 'success',
      message: 'Employees retrieved successfully',
      employees: employees
    });

  } catch (error) {
    // Handle validation or other errors
    return res.status(error.statusCode || 500).json({
      message: error.message || 'Internal server error'
    });
  }
});

router.get('/allotments', async (req, res) => {
  try {
    const allotments = await Allotment.find();
    if (allotments.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No allotments found',
        allotments: []
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Allotments retrieved successfully',
      allotments: allotments
    });

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || 'Internal server error'
    });
  }
});

// Route to get the AC ID based on employee ID
router.get('/employee-allotment/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    // Find the allotment for the specified employee ID
    const allotment = await Allotment.findOne({ employee: employeeId }); // Populate AC details if needed

    // Check if the allotment exists
    if (!allotment) {
      return res.status(200).json({ message: 'No allotment found for the specified employee' });
    }
    //console.log(allotment);
    // Respond with the AC ID and additional AC information
    return res.status(200).json({
      status: 'success',
      allotedACId: allotment.ac
    });

  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || 'Internal server error'
    });
  }
});

router.delete('/delete-ac/:acId', async (req, res) => {
  const { acId } = req.params;

  try {
    // 1. Delete the Assembly Constituency (AC) document
    const deleteAC = await AC.findByIdAndDelete(acId);
    if (!deleteAC) {
      return res.status(404).json({ message: 'AC not found' });
    }

    // 2. Delete related allotments
    const allotment = await Allotment.findOneAndDelete({ ac: acId });
    if (allotment) {
      const employeeId = allotment.employee;

      // 3. Delete documents in EmployeeGrievancesTrack for the allocated employee
      await EmployeeGrievancesTrack.findOneAndDelete({ employeeId });
    }

    // 4. Fetch and delete grievances related to this AC
    const grievances = await LetterRequest.find({ ac: acId });
    for (const grievance of grievances) {
      const grievanceId = grievance._id;

      // Delete the grievance document
      await LetterRequest.findByIdAndDelete(grievanceId);

      // Delete related tracking documents from AssignedwithTrackingDocument
      await AssignedwithTrackingDocument.findOneAndDelete({
        referenceGrievanceDocument: grievanceId,
      });
    }

    // Respond with success
    res.status(200).json({ message: 'AC and related data successfully deleted' });
  } catch (error) {
    //console.error('Error while deleting AC and related data:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/delete-mandal/:mandalId/:acId', async (req, res) => {
  const { mandalId, acId } = req.params;

  try {
    // Step 1: Find the AC and remove the Mandal
    const ac = await AC.findById(acId);
    if (!ac) {
      return res.status(404).json({ message: "AC not found" });
    }

    const mandalIndex = ac.mandals.findIndex(mandal => mandal._id.toString() === mandalId);
    if (mandalIndex === -1) {
      return res.status(404).json({ message: "Mandal not found in the specified AC" });
    }

    // Remove the Mandal
    const removedMandal = ac.mandals.splice(mandalIndex, 1)[0];
    await ac.save();

    // Step 2: Find all LetterRequest documents linked to the Mandal
    const letterRequests = await LetterRequest.find({ mandalId });
    const letterRequestIds = letterRequests.map(lr => lr._id);

    for (const letterRequest of letterRequests) {
      // Step 3: Find the assigned tracking document
      const assignedDoc = await AssignedwithTrackingDocument.findOne({
        referenceGrievanceDocument: letterRequest._id
      });

      if (assignedDoc) {
        const { referenceTrackingDocument } = assignedDoc;

        // Step 4: Find and update the EmployeeGrievancesTrack document
        const trackingDoc = await EmployeeGrievancesTrack.findById(referenceTrackingDocument);
        if (trackingDoc) {
          const category = letterRequest.category; // Get the category of the LetterRequest
          if (trackingDoc.grievanceCategories[category]) {
            // Remove the LetterRequest ID from the category array
            trackingDoc.grievanceCategories[category] = trackingDoc.grievanceCategories[category].filter(
              id => id.toString() !== letterRequest._id.toString()
            );
            await trackingDoc.save();
          }
        }
      }
    }

    // Clean up LetterRequest documents
    await LetterRequest.deleteMany({ _id: { $in: letterRequestIds } });

    res.status(200).json({ message: "Mandal and associated documents deleted successfully" });
  } catch (error) {
    //console.error("Error deleting mandal:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

router.delete('/delete-village/:villageId/:mandalId/:acId', async (req, res) => {
  const { villageId, mandalId, acId } = req.params;

  try {
    // Find the AC by acId
    const ac = await AC.findById(acId);
    if (!ac) {
      return res.status(404).json({ message: "Assembly Constituency not found" });
    }

    // Find the Mandal by mandalId within the AC
    const mandal = ac.mandals.id(mandalId);
    if (!mandal) {
      return res.status(404).json({ message: "Mandal not found in this AC" });
    }

    // Find and remove the Village by villageId within the Mandal
    const villageIndex = mandal.villages.findIndex(village => village._id.toString() === villageId);
    if (villageIndex === -1) {
      return res.status(404).json({ message: "Village not found in this Mandal" });
    }

    mandal.villages.splice(villageIndex, 1); // Remove the village
    await ac.save(); // Save the updated AC document
    // Step 2: Find all LetterRequest documents linked to the Mandal
    const letterRequests = await LetterRequest.find({ villageId });
    const letterRequestIds = letterRequests.map(lr => lr._id);

    for (const letterRequest of letterRequests) {
      // Step 3: Find the assigned tracking document
      const assignedDoc = await AssignedwithTrackingDocument.findOne({
        referenceGrievanceDocument: letterRequest._id
      });

      if (assignedDoc) {
        const { referenceTrackingDocument } = assignedDoc;

        // Step 4: Find and update the EmployeeGrievancesTrack document
        const trackingDoc = await EmployeeGrievancesTrack.findById(referenceTrackingDocument);
        if (trackingDoc) {
          const category = letterRequest.category; // Get the category of the LetterRequest
          if (trackingDoc.grievanceCategories[category]) {
            // Remove the LetterRequest ID from the category array
            trackingDoc.grievanceCategories[category] = trackingDoc.grievanceCategories[category].filter(
              id => id.toString() !== letterRequest._id.toString()
            );
            await trackingDoc.save();
          }
        }
      }
    }

    // Clean up LetterRequest documents
    await LetterRequest.deleteMany({ _id: { $in: letterRequestIds } });

    res.status(200).json({ message: "Mandal and associated documents deleted successfully" });
  } catch (error) {
    //console.error("Error deleting village:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.delete('/delete-allotment/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Step 1: Delete allotment associated with employeeId
    const allotment = await Allotment.findOneAndDelete({ employee: employeeId });
    if (!allotment) {
      return res.status(404).json({ message: 'Allotment not found' });
    }

    // Step 2: Find the EmployeeGrievancesTrack document for the employeeId
    const employeeTrack = await EmployeeGrievancesTrack.findOne({ employeeId });
    if (!employeeTrack) {
      return res.status(404).json({ message: 'Employee grievances track not found' });
    }

    // Step 3: Iterate over each grievance category and delete associated documents in AssignedwithTrackingDocument
    const grievanceCategories = employeeTrack.grievanceCategories;

    for (const category in grievanceCategories) {
      const grievanceIds = grievanceCategories[category];

      // Ensure grievanceIds is an array before iterating
      if (Array.isArray(grievanceIds)) {
        for (const grievanceId of grievanceIds) {
          await AssignedwithTrackingDocument.findOneAndDelete({
            referenceGrievanceDocument: grievanceId,
          });
        }
      } else {
        console.warn(`Skipping category ${category} as it is not an array.`);
      }
    }

    // Step 4: Delete the EmployeeGrievancesTrack document for the employeeId
    await EmployeeGrievancesTrack.findOneAndDelete({ employeeId });

    // Final response
    return res.status(200).json({ message: 'Allotment and related data deleted successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
