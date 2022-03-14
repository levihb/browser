import MainBackground from "./main.background";
import NotificationBackground from "./notification.background";

export default class TabsBackground {
  constructor(
    private main: MainBackground,
    private notificationBackground: NotificationBackground
  ) {}

  private focusedWindowId: number;

  async init() {
    if (!chrome.tabs) {
      return;
    }

    chrome.windows.onFocusChanged.addListener(async (windowId: number) => {
      if (windowId === null || windowId < 0) {
        return;
      }

      this.focusedWindowId = windowId;
      this.main.messagingService.send("windowChanged");
    });

    chrome.tabs.onActivated.addListener(async (activeInfo: chrome.tabs.TabActiveInfo) => {
      console.log("tab onActiviated refreshBadgeAndMenu", activeInfo);
      await this.main.refreshBadgeAndMenu();
      this.main.messagingService.send("tabChanged");
    });

    chrome.tabs.onReplaced.addListener(async (addedTabId: number, removedTabId: number) => {
      if (this.main.onReplacedRan) {
        return;
      }
      this.main.onReplacedRan = true;
      await this.notificationBackground.checkNotificationQueue();
      console.log("tab onReplaced refreshBadgeAndMenu");
      await this.main.refreshBadgeAndMenu();
      this.main.messagingService.send("tabChanged");
    });

    chrome.tabs.onUpdated.addListener(
      async (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
        // console.log("tab onUpdated focusWindowId", this.focusedWindowId);
        if (this.focusedWindowId > 0 && tab.windowId != this.focusedWindowId) {
          return;
        }
        // console.log("tab onUpdated windowId", tab.windowId);
        // console.log("tab onUpdated tabId", tab.id);

        const activeTab = await this.getActiveTabFromCurrentWindow();
        if (activeTab != null && activeTab.id !== tabId) {
          return;
        }

        if (this.main.onUpdatedRan) {
          return;
        }
        this.main.onUpdatedRan = true;
        // console.log("tab onUpdated activeTab", activeTab);
        // console.log("tab onUpdated refreshBadgeAndMenu", changeInfo);

        await this.notificationBackground.checkNotificationQueue(tab);
        await this.main.refreshBadgeAndMenu();
        this.main.messagingService.send("tabChanged");
      }
    );
  }

  async getActiveTabFromCurrentWindow(): Promise<chrome.tabs.Tab> | null {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs: chrome.tabs.Tab[]) => {
        if (tabs.length > 0) {
          resolve(tabs[0]);
        }

        resolve(null);
      });
    });
  }
}
