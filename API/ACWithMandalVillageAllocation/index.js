import express from 'express';
import { AC } from '../../Database/allModels'; // Your AC model
import { model } from 'mongoose';
const { ValidateAC } = require('../../Validation/authentication'); // AC validation function
const authenticateToken = require('../../Middleware/authMiddleware'); // JWT authentication middleware

const Router = express.Router();

Router.get('/getAll-ac', async (req, res) => {
  try {
    // Fetch all AC records from the database
    const getAllac = await AC.find();

    // Return the retrieved data
    return res.status(200).json({ data: getAllac });
  } catch (error) {
    // Return a 500 error for any issues that arise during fetching
    return res.status(500).json({ message: 'Error fetching AC records' });
  }
})

Router.post('/add-ac', async (req, res) => {
  try {
    req.body.name = req.body.name.toUpperCase();
    req.body.PCId = req.body.PCId.toUpperCase();
    // Validate the request body
    await ValidateAC(req.body);

    // Check if a document with the same `name` or `PCId` already exists
    const existingAC = await AC.findOne({
      $or: [{ name: req.body.name }, { PCId: req.body.PCId }]
    });

    if (existingAC) {
      // If a matching document is found, return an appropriate error response
      if (existingAC.name === req.body.name) {
        return res.status(400).json({ message: 'An AC with this name already exists.' });
      }
      if (existingAC.PCId === req.body.PCId) {
        return res.status(400).json({ message: 'An AC with this PCId already exists.' });
      }
    }

    // Insert the new AC record into the database
    const newAC = new AC(req.body);
    await newAC.save();

    // Return success response
    return res.status(201).json({ message: 'AC record added successfully!', data: newAC });
  } catch (error) {
    if (error.isJoi) {
      // Handle validation errors
      return res.status(400).json({ message: error.details[0].message }); // Pass the first validation error message
    }

    // General error handling for database issues, etc.
    return res.status(500).json({ message: 'Error adding AC record' });
  }
});


Router.put('/edit-ac/:id', async (req, res) => {
  try {
    req.body.name = req.body.name.toUpperCase();
    req.body.PCId = req.body.PCId.toUpperCase();
    // Validate the request body (to make sure updated data is valid)
    await ValidateAC(req.body);
    //console.log(req.params.id);
    // Find the AC record by ID and update it with the new data
    // Check if a document with the same `name` or `PCId` already exists
    const existingAC = await AC.findOne({
      $or: [{ name: req.body.name }, { PCId: req.body.PCId }]
    });

    if (existingAC && existingAC._id.toString() !== req.params.id) {
      // If a matching document is found, return an appropriate error response
      if (existingAC.name === req.body.name) {
        return res.status(400).json({ message: 'An AC with this name already exists.' });
      }
      if (existingAC.PCId === req.body.PCId) {
        return res.status(400).json({ message: 'An AC with this PCId already exists.' });
      }
    }
    const updatedAC = await AC.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // Return the updated document
      runValidators: true, // Ensure validation rules are applied on update
    });

    if (!updatedAC) {
      return res.status(404).json({ message: 'AC record not found' });
    }
    //console.log('AC record updated successfully!');
    return res.status(200).json({ status: 'success', message: 'AC record updated successfully!', data: updatedAC });
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({ message: error.details[0].message }); // Validation error response
    }

    // General error handling
    //console.log(error);

    return res.status(500).json({ message: 'Error updating AC record' });
  }
});

Router.get('/getAll-mandal/:acId', authenticateToken, async (req, res) => {
  try {
    // Find the AC record by ID and populate the mandals
    const ac = await AC.findById(req.params.acId)
    // Check if the AC record exists
    if (!ac) {
      return res.status(404).json({ message: 'AC not found' });
    }

    // Return the mandals associated with the AC
    return res.status(200).json({ acId: ac._id, mandal: ac.mandals });
  } catch (error) {
    return res.status(500).json({ message: 'Error retrieving mandals', error: error.message });
  }
})

Router.post('/add-mandal/:acId', async (req, res) => {
  let { name } = req.body;
  name = name.toUpperCase(); // Capitalize the name for consistency
  const acId = req.params.acId;

  try {
    // Find the AC document by ID
    const ac = await AC.findById(acId);

    if (!ac) {
      return res.status(404).json({ message: 'AC not found' });
    }

    // Check if the mandal name already exists in the mandals array
    const isDuplicate = ac.mandals.some((mandal) => mandal.name === name);

    if (isDuplicate) {
      return res.status(400).json({ message: 'Mandal with this name already exists' });
    }

    // Add the new mandal to the mandals array
    ac.mandals.push({ name });
    await ac.save();

    // Return success response with the newly added mandal
    return res.status(200).json({
      message: 'Mandal added successfully',
      data: ac.mandals[ac.mandals.length - 1],
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error adding Mandal', error: error.message });
  }
});

Router.put('/edit-mandal/:acId/:mandalId', async (req, res) => {
  let { name } = req.body;
  name = name.toUpperCase(); // Capitalize the name
  const { acId, mandalId } = req.params;

  try {
  
    // Retrieve the AC document to check for duplicates
    const ac = await AC.findById(acId);

    if (!ac) {
      return res.status(404).json({ message: 'AC not found' });
    }

    // Check if the name already exists in the mandals array (excluding the current mandalId)
    const isDuplicate = ac.mandals.some(
      (mandal) => mandal.name.toUpperCase() === name.toUpperCase() && mandal._id.toString() !== mandalId
    );
    //console.log(isDuplicate);
    if (isDuplicate) {
      //console.log("duplicate");
      return res.status(400).json({ message: 'Mandal with this name already exists' });
    }

    // Update the specific mandal's name
    const updatedAC = await AC.findOneAndUpdate(
      { _id: acId, 'mandals._id': mandalId },
      { $set: { 'mandals.$.name': name } }, // Update the specific mandal's name
      { new: true }
    );

    if (!updatedAC) {
      return res.status(404).json({ message: 'AC or Mandal not found' });
    }

    return res.status(200).json({ message: 'Mandal updated successfully', data: updatedAC });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating Mandal', error: error.message });
  }
});

Router.put('/edit-village/:acId/:mandalId/:villageId', async (req, res) => {
  let { name, population } = req.body;
  name = name.toUpperCase(); // Capitalize the name
  const { acId, mandalId, villageId } = req.params;

  try {
    // Retrieve the AC document to check for duplicates
    const ac = await AC.findById(acId);

    if (!ac) {
      return res.status(404).json({ message: 'AC not found' });
    }

    // Find the specified Mandal
    const mandal = ac.mandals.id(mandalId);

    if (!mandal) {
      return res.status(404).json({ message: 'Mandal not found' });
    }

    // Check if the village name already exists in the villages array (excluding the current village)
    const isDuplicate = mandal.villages.some(
      (village) => village.name.toUpperCase() === name.toUpperCase() && village._id.toString() !== villageId
    );

    if (isDuplicate) {
      return res.status(400).json({ message: 'Village with this name already exists' });
    }

    // Find and update the specific village
    const village = mandal.villages.id(villageId);

    if (!village) {
      return res.status(404).json({ message: 'Village not found' });
    }

    // Update the fields
    village.name = name;

    // Save the updated AC document
    await ac.save();

    return res.status(200).json({
      message: 'Village updated successfully',
      data: village,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error updating village', error: error.message });
  }
});

Router.post('/add-village/:acId/:mandalId', async (req, res) => {
  const { name } = req.body;
  const { acId, mandalId } = req.params;

  try {
    // Find the AC and the mandal, and push a new village to the villages array
    const ac = await AC.findOneAndUpdate(
      { _id: acId, 'mandals._id': mandalId },
      { $push: { 'mandals.$.villages': { name } } }, // Add village to specific mandal
      { new: true }
    );

    if (!ac) {
      return res.status(404).json({ message: 'AC or Mandal not found' });
    }

    const gerSelectedAC = await AC.findOne(
      { _id: acId, 'mandals._id': mandalId },
      { 'mandals.$': 1 } // Return only the mandal with the matching _id
    );
    const villages = gerSelectedAC.mandals[0].villages;
    const lastVillage = villages[villages.length - 1];

    return res.status(200).json({ message: 'Village added successfully', data: lastVillage });
  } catch (error) {
    return res.status(500).json({ message: 'Error adding village' });
  }
});

module.exports = Router;