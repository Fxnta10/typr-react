const axios = require("axios");

async function generateParagraphAPI(wordCount) {
  try {
    const url = `https://random-word-api.herokuapp.com/word?number=${wordCount}`;
    const res = await axios.get(url);

    if (Array.isArray(res.data)) {
      const paragraph = res.data.join(" ");
      console.log(paragraph);
      return paragraph;
    } else {
      throw new Error("Unexpected API response format");
    }
  } catch (err) {
    console.error("Error generating paragraph:", err.message);
    return "";
  }
}

module.exports = {
  generateParagraphAPI,
};
