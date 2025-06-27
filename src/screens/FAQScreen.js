import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { List } from 'react-native-paper';
import faqData from '../utils/faqData';

const FAQScreen = () => {
  const [expanded, setExpanded] = useState([]);

  const handlePress = (index) => {
    setExpanded((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  return (
    <ScrollView>
      {faqData.map((item, idx) => (
        <List.Accordion
          key={item.category}
          title={item.category}
          expanded={expanded.includes(idx)}
          onPress={() => handlePress(idx)}
        >
          {item.questions.map((q, qIdx) => (
            <List.Item key={qIdx} title={q} />
          ))}
        </List.Accordion>
      ))}
    </ScrollView>
  );
};

export default FAQScreen; 