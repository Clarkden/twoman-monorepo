import { StyleSheet } from "react-native";

export const mainPurple = "#a364f5";
export const goldYellow = "#f5d364"; // Goldish yellow that complements the purple
export const mainBackgroundColor = "#1a1a1a"; // Instagram-style matte dark gray
export const secondaryBackgroundColor = "#262626"; // Slightly brighter for contrast
export const accentGray = "#7f7985";
export const borderColor = "#2e2c2c";

export const globalStyles = StyleSheet.create({
  regularText: {
    fontSize: 16,
    color: "white",
  },
  regularView: {
    padding: 20,
    flexDirection: "column",
    gap: 5,
    backgroundColor: mainBackgroundColor,
    height: "100%",
  },
  regularTextInput: {
    color: "white",
    backgroundColor: "#262626",
    padding: 10,
    borderRadius: 7,
  },
  regularMultiLineTextInput: {
    flex: 1,
    borderRadius: 10,
    color: "white",
    paddingTop: 0,
    paddingBottom: 0,
    padding: 5,
  },
  regularLabel: {
    fontSize: 14,
    color: "white",
  },
  regularTouchableOpacity: {
    backgroundColor: "#a364f5",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  secondaryTouchableOpacity: {
    backgroundColor: "white",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  destroyTouchableOpacity: {
    backgroundColor: "#f05454",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
  },
  chatGroupView: {
    flexDirection: "row",
    height: 100,
    padding: 10,
  },
  chatGroupName: {
    fontWeight: "700",
  },
  chatGroupProfilePictureSolo: {
    borderRadius: 100,
    width: 48,
    height: 48,
    backgroundColor: "grey",
  },
  onboardingNextButton: {
    backgroundColor: "black",
    padding: 10,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    width: "100%",
  },
  onboardingNextButtonContainer: {
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  onBoardingNextButtonText: {
    color: "white",
    fontWeight: "600",
  },
  onboardingInputColor: {
    backgroundColor: "white",
  },
});
