const chatbotService = require('../services/chatbotService');

const getChatbotResponse = async (req, res, next) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'Message is required and must be a string'
      });
    }

    const response = await chatbotService.chat(message, req.user, history || []);
    return res.status(200).json({
      status: 'success',
      data: response
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getChatbotResponse
};
