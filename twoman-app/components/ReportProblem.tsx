import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useState } from "react";
import {
  accentGray,
  mainBackgroundColor,
  mainPurple,
  secondaryBackgroundColor,
} from "@/constants/globalStyles";
import apiFetch from "@/utils/fetch";

export default function ReportProblem({ onClose }: { onClose: () => void }) {
  const [problem, setProblem] = useState<string>("");

  const handleReportProblem = async () => {
    try {
      const response = await apiFetch("/bug", {
        method: "POST",
        body: {
          problem,
        },
      });

      if (!response.success) {
        console.log(response.error);
        return;
      }

      Alert.alert(
        "Success",
        "Thank you for reporting the problem. We will look into it.",
      );

      onClose();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <View style={styles.container}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={styles.header}>Report a Bug</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ color: accentGray }}>Close</Text>
        </TouchableOpacity>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Describe the problem"
        value={problem}
        onChangeText={setProblem}
        placeholderTextColor={accentGray}
        multiline
      />
      <TouchableOpacity
        style={styles.submitButton}
        onPress={handleReportProblem}
      >
        <Text style={styles.submitButtonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: mainBackgroundColor,
    padding: 20,
    gap: 20,
  },
  input: {
    height: 100,
    width: "100%",
    backgroundColor: secondaryBackgroundColor,
    padding: 10,
    borderRadius: 10,
    color: "#fff",
  },
  submitButton: {
    backgroundColor: mainPurple,
    padding: 10,
    borderRadius: 20,
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  header: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
});
