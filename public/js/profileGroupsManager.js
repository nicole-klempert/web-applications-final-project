// load groups and counters for the profile page
document.addEventListener("DOMContentLoaded", async () => {
    const currentUser=(localStorage.getItem("loggedInUser")||"").trim();
    if(!currentUser)return;
    const profileUsername=new URLSearchParams(window.location.search).get("user")||currentUser;
    const groupCount=document.getElementById("profile-groups-count"),managed=document.getElementById("managed-groups-container"),member=document.getElementById("member-groups-container");
    const card=group=>`<a class="profile-group-card" href="group.html?id=${encodeURIComponent(group._id)}">${group.image?`<img src="${group.image}" alt="${group.name}">`:`<div class="profile-group-placeholder"><i class="bi bi-people-fill"></i></div>`}<div><strong>${group.name}</strong><span>${group.category||"General"}${group.city?` • ${group.city}`:""}</span><small>${group.memberCount} members</small></div></a>`;
    const render=(el,groups,text)=>{if(!el)return;el.innerHTML=groups.length?groups.map(card).join(""):`<p class="profile-groups-empty">${text}</p>`;};
    try{
        const res=await fetch(`/users/${encodeURIComponent(profileUsername)}/stats`,{headers:{Accept:"application/json"}}),data=await res.json();
        if(!res.ok||!data.success)return;
        if(groupCount)groupCount.textContent=data.stats.groupCount;
        const posts=document.getElementById("profile-posts-count");if(posts)posts.textContent=data.stats.postCount;
        render(managed,data.stats.managedGroups||[],"No managed groups.");
        render(member,data.stats.memberGroups||[],"No member groups.");
    }catch(error){console.error("Failed to load profile groups:",error);}
});
